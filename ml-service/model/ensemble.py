"""
Módulo de Ensemble Learning para predicción de rendimientos agrícolas.

Arquitectura de Stacking (2 niveles):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Nivel 0 — Estimadores base (entrenados con CV=5 interno):
  ① RandomForestRegressor   → Bagging: reduce varianza, maneja no-linealidades
  ② GradientBoostingRegressor → Boosting secuencial: reduce sesgo iterativamente
  ③ XGBRegressor             → Boosting regularizado: robusto a outliers

Nivel 1 — Meta-regresor:
  Ridge (α=0.5) → aprende combinación lineal óptima de predicciones base

Intervalos de confianza (IC 90%):
  Percentiles 5 y 95 de las predicciones de todos los árboles del RF.
  Esto es equivalente a un bootstrap percentile implícito.

Métrica de confianza reportada:
  confianza = 100 - (IQR(árboles_RF) / estimado_central × 100)
  Rango: [0, 100]. Mayor = más preciso.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
import logging
from pathlib import Path
from typing import Tuple, Optional

import joblib
import numpy as np
from sklearn.ensemble import (
    RandomForestRegressor,
    GradientBoostingRegressor,
    StackingRegressor,
)
from sklearn.linear_model import Ridge
from sklearn.model_selection import KFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, r2_score
from xgboost import XGBRegressor

from .training_data import generar_datos_entrenamiento

logger = logging.getLogger(__name__)

# ─── Constantes ───────────────────────────────────────────────────────────────
FEATURE_COLUMNS = [
    "temperatura_promedio",
    "humedad_suelo_promedio",
    "precipitacion_acumulada",
    "dias_desde_siembra",
    "hectareas",
    "tipo_suelo_encoded",
]
TARGET_COLUMN = "rendimiento_kg_ha"
MODEL_VERSION = "v1.0"


# ─── Construcción del ensemble ────────────────────────────────────────────────

def construir_ensemble() -> StackingRegressor:
    """
    Construye el ensemble StackingRegressor con 3 estimadores base y Ridge meta.

    Hiperparámetros seleccionados para el caso de uso:
    - RF: 200 árboles, profundidad 12 → buen balance varianza/sesgo
    - GB: lr=0.05, 150 estimadores → convergencia conservadora, evita sobreajuste
    - XGB: regularización l1+l2 → robusto a outliers en datos de campo
    - Ridge α=0.5 → suaviza los pesos del meta-modelo

    Returns:
        StackingRegressor configurado (sin entrenar)
    """
    estimadores_base = [
        (
            "rf",
            RandomForestRegressor(
                n_estimators=200,
                max_depth=12,
                min_samples_leaf=5,
                max_features="sqrt",
                random_state=42,
                n_jobs=-1,
            ),
        ),
        (
            "gb",
            GradientBoostingRegressor(
                n_estimators=150,
                learning_rate=0.05,
                max_depth=5,
                subsample=0.8,
                min_samples_leaf=5,
                random_state=42,
            ),
        ),
        (
            "xgb",
            XGBRegressor(
                n_estimators=150,
                learning_rate=0.05,
                max_depth=6,
                subsample=0.8,
                colsample_bytree=0.8,
                reg_alpha=0.1,
                reg_lambda=1.0,
                random_state=42,
                verbosity=0,
                n_jobs=-1,
            ),
        ),
    ]

    # El meta-regresor combina las salidas de los 3 base mediante Ridge
    meta_regresor = Ridge(alpha=0.5)

    return StackingRegressor(
        estimators=estimadores_base,
        final_estimator=meta_regresor,
        cv=5,           # k-fold para generar OOF meta-features
        passthrough=False,  # solo predicciones de base → meta
        n_jobs=-1,
    )


# ─── Entrenamiento ────────────────────────────────────────────────────────────

def entrenar_modelo(
    ruta_salida: Optional[str] = None,
) -> Tuple[Pipeline, dict]:
    """
    Entrena el ensemble completo con datos sintéticos y lo persiste en disco.

    Pipeline completo:
      StandardScaler → StackingRegressor

    El StandardScaler es necesario porque Ridge (meta-regresor) es sensible
    a la escala de las features de meta nivel.

    Args:
        ruta_salida: Ruta del archivo .pkl. Default: /app/model/ensemble_v1.pkl

    Returns:
        Tupla (pipeline_entrenado, dict_metricas)
    """
    logger.info("Generando datos de entrenamiento (n=800)...")
    df = generar_datos_entrenamiento(n_muestras=800)

    X = df[FEATURE_COLUMNS].values
    y = df[TARGET_COLUMN].values

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("ensemble", construir_ensemble()),
    ])

    # ── Validación cruzada 5-fold para métricas robustas ──────────────────
    logger.info("Ejecutando validación cruzada 5-fold...")
    kf = KFold(n_splits=5, shuffle=True, random_state=42)
    cv_r2 = cross_val_score(pipeline, X, y, cv=kf, scoring="r2", n_jobs=-1)
    cv_rmse = cross_val_score(
        pipeline, X, y, cv=kf,
        scoring="neg_root_mean_squared_error", n_jobs=-1,
    )
    logger.info(
        f"CV R²: {cv_r2.mean():.4f} ± {cv_r2.std():.4f} | "
        f"CV RMSE: {(-cv_rmse).mean():.1f} ± {(-cv_rmse).std():.1f} kg/ha"
    )

    # ── Entrenamiento final con todos los datos ────────────────────────────
    logger.info("Entrenando con dataset completo...")
    pipeline.fit(X, y)

    y_pred = pipeline.predict(X)
    metricas = {
        "rmse":       float(np.sqrt(mean_squared_error(y, y_pred))),
        "r2":         float(r2_score(y, y_pred)),
        "r2_cv_mean": float(cv_r2.mean()),
        "r2_cv_std":  float(cv_r2.std()),
        "n_muestras": int(len(y)),
    }

    # ── Persistencia ──────────────────────────────────────────────────────
    ruta = ruta_salida or "/app/model/ensemble_v1.pkl"
    Path(ruta).parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"pipeline": pipeline, "version": MODEL_VERSION}, ruta)
    logger.info(f"Modelo guardado: {ruta} — R²={metricas['r2']:.4f}, RMSE={metricas['rmse']:.1f} kg/ha")

    return pipeline, metricas


# ─── Predicción con intervalos ────────────────────────────────────────────────

def predecir(
    pipeline: Pipeline,
    features: dict,
) -> Tuple[float, float, float, float]:
    """
    Genera predicción central e intervalos de confianza al 90%.

    Algoritmo de intervalos:
    1. Escalar X con el StandardScaler del pipeline
    2. Extraer el RandomForestRegressor del StackingRegressor
    3. Recolectar predicción de cada árbol individual del RF
    4. Calcular P5 (límite inferior) y P95 (límite superior)
    5. Calcular confianza = 100 - IQR/estimado*100

    Args:
        pipeline: Pipeline entrenado (scaler + StackingRegressor)
        features: Diccionario con las 6 features esperadas

    Returns:
        Tupla (estimado_kg_ha, intervalo_inferior, intervalo_superior, confianza_pct)
    """
    X = np.array([[
        features["temperatura_promedio"],
        features["humedad_suelo_promedio"],
        features["precipitacion_acumulada"],
        float(features["dias_desde_siembra"]),
        features["hectareas"],
        float(features["tipo_suelo_encoded"]),
    ]])

    # Predicción central del ensemble completo (stacking)
    estimado = float(pipeline.predict(X)[0])

    # Escalar X para acceder a los árboles internos del RF
    X_scaled = pipeline.named_steps["scaler"].transform(X)
    stacking: StackingRegressor = pipeline.named_steps["ensemble"]

    # El primer estimador es el RandomForest (índice 0)
    rf: RandomForestRegressor = stacking.estimators_[0]

    # Predicciones de todos los árboles individuales del RF
    preds_arboles = np.array([
        arbol.predict(X_scaled)[0]
        for arbol in rf.estimators_
    ])

    # Intervalos percentílicos
    intervalo_inf = float(np.percentile(preds_arboles, 5))
    intervalo_sup = float(np.percentile(preds_arboles, 95))

    # Confianza basada en IQR normalizado
    iqr = float(np.percentile(preds_arboles, 75) - np.percentile(preds_arboles, 25))
    confianza = max(0.0, min(100.0, 100.0 - (iqr / estimado * 100))) if estimado > 0 else 50.0

    return estimado, intervalo_inf, intervalo_sup, confianza
