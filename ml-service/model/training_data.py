"""
Generación de datos de entrenamiento sintéticos con correlaciones
agronómicas reales para maíz (Zea mays L.) en costa norte del Perú.
Basado en parámetros del CIMMYT, FAOSTAT La Libertad e INIA Perú.
"""
import numpy as np
import pandas as pd

RANDOM_SEED = 42


def generar_datos_entrenamiento(n_muestras: int = 800) -> pd.DataFrame:
    """
    Genera un dataset sintético agronómicamente realista.

    Correlaciones implementadas:
    - Temperatura óptima ~25°C; rendimiento cae parabolicamente fuera de 20-30°C
    - Estrés hídrico (<40%VWC) reduce linealmente el rendimiento
    - Exceso hídrico (>70%VWC) penaliza por anoxia radicular
    - Precipitación contribuye positivamente con log-retorno decreciente
    - Suelo franco/limoso tiene bonus vs arenoso/arcilloso puro
    - Ruido gaussiano realista (~350 kg/ha σ)

    Args:
        n_muestras: Número de muestras a generar (default: 800)

    Returns:
        DataFrame con 6 features y columna objetivo `rendimiento_kg_ha`
    """
    rng = np.random.RandomState(RANDOM_SEED)

    # ── Variables independientes ───────────────────────────────────────────
    temperatura = rng.normal(loc=25.0, scale=3.5, size=n_muestras).clip(15, 38)
    humedad_suelo = rng.normal(loc=52.0, scale=12.0, size=n_muestras).clip(20, 85)
    # Precipitación: distribución exponencial (eventos esporádicos frecuentes)
    precipitacion = rng.exponential(scale=45.0, size=n_muestras).clip(0, 300)
    dias_siembra = rng.randint(30, 120, size=n_muestras)
    hectareas = rng.uniform(2.0, 50.0, size=n_muestras)
    tipo_suelo = rng.randint(0, 4, size=n_muestras)  # 0=arenoso…3=limoso

    # ── Factor de temperatura (parábola centrada en 25°C) ──────────────────
    # Baja si T < 18°C (estrés frío) o T > 32°C (estrés calórico)
    temp_factor = np.clip(
        1.0 - 0.018 * (temperatura - 25.0) ** 2,
        0.1,
        1.0,
    )

    # ── Factor hídrico del suelo ───────────────────────────────────────────
    hum_factor = np.where(
        humedad_suelo < 40,
        humedad_suelo / 40,               # estrés severo lineal
        np.where(
            humedad_suelo > 70,
            1.0 - (humedad_suelo - 70) / 80,  # anoxia gradual
            1.0,                              # zona óptima
        ),
    ).clip(0.1, 1.0)

    # ── Factor de precipitación (log-retorno decreciente) ─────────────────
    precip_factor = np.log1p(precipitacion) / np.log1p(150)  # normalizado a ~1

    # ── Bonus por tipo de suelo ────────────────────────────────────────────
    # arenoso=0 (peor retención), franco=1, arcilloso=2, limoso=3 (mejor)
    suelo_bonus = np.array([0.0, 0.06, -0.02, 0.09])[tipo_suelo]

    # ── Rendimiento base con interacción entre factores ────────────────────
    rendimiento_base = (
        9500.0
        * temp_factor
        * hum_factor
        * precip_factor
        * (1.0 + suelo_bonus)
        + rng.normal(0, 350, n_muestras)   # variabilidad de campo
    ).clip(800, 12500)

    return pd.DataFrame(
        {
            "temperatura_promedio":      temperatura,
            "humedad_suelo_promedio":    humedad_suelo,
            "precipitacion_acumulada":   precipitacion,
            "dias_desde_siembra":        dias_siembra.astype(float),
            "hectareas":                 hectareas,
            "tipo_suelo_encoded":        tipo_suelo.astype(float),
            "rendimiento_kg_ha":         rendimiento_base,
        }
    )
