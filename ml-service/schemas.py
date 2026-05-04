"""Esquemas Pydantic para request/response del ML Service."""
from pydantic import BaseModel, Field


class FeatureVector(BaseModel):
    """
    Vector de características de entrada para el modelo de predicción.
    Basado en variables agronómicas estándar FAO-56 + edáficas.
    Todos los valores deben corresponder a promedios de los últimos 30 días.
    """
    temperatura_promedio: float = Field(
        ..., ge=-10, le=50,
        description="Temperatura promedio del período (°C). Rango típico Perú costa: 18–35°C.",
        example=25.0,
    )
    humedad_suelo_promedio: float = Field(
        ..., ge=0, le=100,
        description="Humedad volumétrica del suelo promedio (%VWC). CC≈60%, PMP≈25%.",
        example=52.0,
    )
    precipitacion_acumulada: float = Field(
        ..., ge=0,
        description="Precipitación acumulada en el período (mm).",
        example=45.0,
    )
    dias_desde_siembra: int = Field(
        ..., ge=0, le=400,
        description="Días transcurridos desde la siembra.",
        example=60,
    )
    hectareas: float = Field(
        ..., gt=0,
        description="Superficie del lote en hectáreas.",
        example=12.5,
    )
    tipo_suelo_encoded: int = Field(
        ..., ge=0, le=3,
        description="Tipo de suelo codificado: 0=arenoso, 1=franco, 2=arcilloso, 3=limoso.",
        example=1,
    )


class PredictRequest(BaseModel):
    features: FeatureVector

    class Config:
        json_schema_extra = {
            "example": {
                "features": {
                    "temperatura_promedio": 25.0,
                    "humedad_suelo_promedio": 55.0,
                    "precipitacion_acumulada": 80.0,
                    "dias_desde_siembra": 60,
                    "hectareas": 12.5,
                    "tipo_suelo_encoded": 1,
                }
            }
        }


class PredictResponse(BaseModel):
    rendimiento_estimado_kg_ha: float = Field(
        ..., description="Predicción central del ensemble stacking (kg/ha)."
    )
    intervalo_inferior_kg_ha: float = Field(
        ..., description="Límite inferior IC 90% — percentil 5 de árboles RF (kg/ha)."
    )
    intervalo_superior_kg_ha: float = Field(
        ..., description="Límite superior IC 90% — percentil 95 de árboles RF (kg/ha)."
    )
    confianza_porcentaje: float = Field(
        ..., ge=0, le=100,
        description="Confianza del modelo: 100 - (IQR/estimado × 100), acotado a [0,100].",
    )
    version_modelo: str = Field(default="v1.0", description="Versión del artefacto ML.")


class TrainResponse(BaseModel):
    mensaje: str
    rmse: float = Field(..., description="Root Mean Square Error en kg/ha (entrenamiento).")
    r2: float = Field(..., description="Coeficiente de determinación R² (entrenamiento).")
    n_muestras: int
    version_modelo: str
