"""
AgriFlow ML Service — FastAPI v1.0
Microservicio de predicción de rendimientos con Ensemble Learning (Stacking).

Estrategia de ensemble:
  - Estimadores base: RandomForest (bagging) + GradientBoosting (boosting)
    + XGBoost (boosting regularizado)
  - Meta-regresor: Ridge (α=0.5) — aprende la combinación óptima de
    las predicciones de los 3 estimadores base via stacking con CV=5
  - Intervalos de confianza al 90%: percentiles 5/95 de los árboles del RF
  - Confianza reportada: función de dispersión IQR normalizado
"""
import os
import logging
from contextlib import asynccontextmanager
from pathlib import Path

import joblib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from schemas import PredictRequest, PredictResponse, TrainResponse
from model.ensemble import entrenar_modelo, predecir, MODEL_VERSION

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("agriflow-ml")

# ─── Estado global del modelo ─────────────────────────────────────────────────
_pipeline = None
MODEL_PATH = os.getenv("ML_MODEL_PATH", "/app/model/ensemble_v1.pkl")


def cargar_o_entrenar():
    """Carga el modelo desde disco o entrena uno nuevo si no existe."""
    global _pipeline
    ruta = Path(MODEL_PATH)

    if ruta.exists():
        try:
            artefacto = joblib.load(ruta)
            _pipeline = artefacto["pipeline"]
            ver = artefacto.get("version", "desconocida")
            logger.info(f"✅ Modelo cargado desde {ruta} (versión {ver})")
            return
        except Exception as exc:
            logger.warning(f"Error al cargar modelo ({exc}), reentrenando...")

    logger.info("🔄 Entrenando modelo desde datos semilla...")
    _pipeline, metricas = entrenar_modelo(str(ruta))
    logger.info(
        f"✅ Modelo entrenado: R²={metricas['r2']:.4f}, "
        f"RMSE={metricas['rmse']:.1f} kg/ha, "
        f"n={metricas['n_muestras']} muestras"
    )


# ─── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    cargar_o_entrenar()
    yield
    logger.info("🛑 ML Service cerrando...")


# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AgriFlow ML Service",
    description=(
        "Predicción de rendimientos agrícolas usando Ensemble Learning "
        "(RF + GradientBoosting + XGBoost con meta-regresor Ridge)."
    ),
    version=MODEL_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health", tags=["sistema"])
def health():
    """Verifica que el servicio esté activo y el modelo cargado."""
    return {
        "status": "ok",
        "model_loaded": _pipeline is not None,
        "version": MODEL_VERSION,
    }


@app.post("/predict", response_model=PredictResponse, tags=["prediccion"])
def predict(request: PredictRequest):
    """
    Predice el rendimiento del cultivo (kg/ha) dado un vector de features.

    Retorna:
    - `rendimiento_estimado_kg_ha`: predicción central del ensemble stacking
    - `intervalo_inferior_kg_ha` / `intervalo_superior_kg_ha`: IC 90% (P5/P95 de RF)
    - `confianza_porcentaje`: 0–100, mayor es más preciso
    - `version_modelo`: versión del artefacto ML utilizado
    """
    if _pipeline is None:
        raise HTTPException(
            status_code=503,
            detail="Modelo no disponible. Reintentar en unos segundos.",
        )

    try:
        features = request.features.model_dump()
        estimado, inf, sup, confianza = predecir(_pipeline, features)

        return PredictResponse(
            rendimiento_estimado_kg_ha=round(estimado, 2),
            intervalo_inferior_kg_ha=round(max(0.0, inf), 2),
            intervalo_superior_kg_ha=round(sup, 2),
            confianza_porcentaje=round(confianza, 1),
            version_modelo=MODEL_VERSION,
        )
    except Exception as exc:
        logger.error(f"Error en predicción: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error interno de predicción: {str(exc)}",
        )


@app.post("/train", response_model=TrainResponse, tags=["entrenamiento"])
def train():
    """
    Reentrenamiento manual del ensemble con datos semilla.
    En producción, proteger con autenticación antes de exponer.
    """
    global _pipeline
    try:
        logger.info("🔄 Iniciando reentrenamiento del ensemble...")
        pipeline, metricas = entrenar_modelo(MODEL_PATH)
        _pipeline = pipeline
        logger.info(
            f"✅ Reentrenamiento completado: R²={metricas['r2']:.4f}, "
            f"RMSE={metricas['rmse']:.1f} kg/ha"
        )
        return TrainResponse(
            mensaje="Ensemble reentrenado exitosamente",
            rmse=round(metricas["rmse"], 2),
            r2=round(metricas["r2"], 4),
            n_muestras=metricas["n_muestras"],
            version_modelo=MODEL_VERSION,
        )
    except Exception as exc:
        logger.error(f"Error en reentrenamiento: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False, workers=2)
