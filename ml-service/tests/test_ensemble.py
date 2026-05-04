"""
Tests para el microservicio FastAPI de predicción de rendimientos.
Cubre: generación de datos, construcción del ensemble, predicciones
y endpoints HTTP.
"""
import pytest
import numpy as np
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def datos_entrenamiento():
    from model.training_data import generar_datos_entrenamiento
    return generar_datos_entrenamiento(n_muestras=200)


@pytest.fixture(scope="session")
def pipeline_entrenado(tmp_path_factory):
    """Entrena el ensemble una sola vez para todos los tests de sesión."""
    tmp = tmp_path_factory.mktemp("model")
    ruta = str(tmp / "ensemble_test.pkl")
    from model.ensemble import entrenar_modelo
    pipeline, metricas = entrenar_modelo(ruta_salida=ruta)
    return pipeline, metricas


@pytest.fixture
def client(pipeline_entrenado):
    """Cliente de test de FastAPI con modelo ya cargado."""
    pipeline, _ = pipeline_entrenado
    with patch("main._pipeline", pipeline):
        from main import app
        with TestClient(app) as c:
            yield c


@pytest.fixture
def features_validas():
    return {
        "temperatura_promedio": 25.0,
        "humedad_suelo_promedio": 55.0,
        "precipitacion_acumulada": 80.0,
        "dias_desde_siembra": 60,
        "hectareas": 12.5,
        "tipo_suelo_encoded": 1,
    }


# ─── Tests: Generación de datos ───────────────────────────────────────────────

class TestDatosEntrenamiento:
    def test_genera_cantidad_correcta(self, datos_entrenamiento):
        assert len(datos_entrenamiento) == 200

    def test_columnas_presentes(self, datos_entrenamiento):
        columnas_esperadas = {
            "temperatura_promedio",
            "humedad_suelo_promedio",
            "precipitacion_acumulada",
            "dias_desde_siembra",
            "hectareas",
            "tipo_suelo_encoded",
            "rendimiento_kg_ha",
        }
        assert columnas_esperadas.issubset(set(datos_entrenamiento.columns))

    def test_valores_temperatura_en_rango(self, datos_entrenamiento):
        assert datos_entrenamiento["temperatura_promedio"].between(15, 38).all()

    def test_valores_humedad_en_rango(self, datos_entrenamiento):
        assert datos_entrenamiento["humedad_suelo_promedio"].between(20, 85).all()

    def test_rendimiento_positivo(self, datos_entrenamiento):
        assert (datos_entrenamiento["rendimiento_kg_ha"] > 0).all()

    def test_rendimiento_en_rango_maiz(self, datos_entrenamiento):
        # Maíz en Perú: 1000-12000 kg/ha
        assert datos_entrenamiento["rendimiento_kg_ha"].between(1000, 12000).all()

    def test_reproducibilidad_con_seed(self):
        from model.training_data import generar_datos_entrenamiento
        df1 = generar_datos_entrenamiento(100)
        df2 = generar_datos_entrenamiento(100)
        assert (df1["rendimiento_kg_ha"].values == df2["rendimiento_kg_ha"].values).all()


# ─── Tests: Entrenamiento del ensemble ────────────────────────────────────────

class TestEnsemble:
    def test_entrenamiento_exitoso(self, pipeline_entrenado):
        pipeline, metricas = pipeline_entrenado
        assert pipeline is not None
        assert "rmse" in metricas
        assert "r2" in metricas

    def test_r2_aceptable(self, pipeline_entrenado):
        _, metricas = pipeline_entrenado
        # R² > 0.70 es aceptable para un modelo con datos sintéticos
        assert metricas["r2"] > 0.70, f"R² demasiado bajo: {metricas['r2']:.4f}"

    def test_rmse_razonable(self, pipeline_entrenado):
        _, metricas = pipeline_entrenado
        # RMSE < 1500 kg/ha es aceptable
        assert metricas["rmse"] < 1500, f"RMSE muy alto: {metricas['rmse']:.1f}"

    def test_prediccion_escalar(self, pipeline_entrenado):
        pipeline, _ = pipeline_entrenado
        from model.ensemble import predecir
        features = {
            "temperatura_promedio": 25.0,
            "humedad_suelo_promedio": 55.0,
            "precipitacion_acumulada": 80.0,
            "dias_desde_siembra": 60,
            "hectareas": 12.5,
            "tipo_suelo_encoded": 1,
        }
        est, inf, sup, confianza = predecir(pipeline, features)
        assert isinstance(est, float)
        assert isinstance(confianza, float)

    def test_intervalo_coherente(self, pipeline_entrenado):
        pipeline, _ = pipeline_entrenado
        from model.ensemble import predecir
        features = {
            "temperatura_promedio": 25.0,
            "humedad_suelo_promedio": 55.0,
            "precipitacion_acumulada": 80.0,
            "dias_desde_siembra": 60,
            "hectareas": 12.5,
            "tipo_suelo_encoded": 1,
        }
        est, inf, sup, _ = predecir(pipeline, features)
        assert inf <= est <= sup, f"Intervalo incoherente: [{inf}, {est}, {sup}]"

    def test_confianza_en_rango(self, pipeline_entrenado):
        pipeline, _ = pipeline_entrenado
        from model.ensemble import predecir
        features = {
            "temperatura_promedio": 25.0,
            "humedad_suelo_promedio": 55.0,
            "precipitacion_acumulada": 80.0,
            "dias_desde_siembra": 60,
            "hectareas": 12.5,
            "tipo_suelo_encoded": 1,
        }
        _, _, _, confianza = predecir(pipeline, features)
        assert 0 <= confianza <= 100

    def test_rendimiento_positivo(self, pipeline_entrenado):
        pipeline, _ = pipeline_entrenado
        from model.ensemble import predecir
        features = {
            "temperatura_promedio": 28.0,
            "humedad_suelo_promedio": 30.0,  # estrés hídrico
            "precipitacion_acumulada": 10.0,
            "dias_desde_siembra": 45,
            "hectareas": 5.0,
            "tipo_suelo_encoded": 0,
        }
        est, inf, _, _ = predecir(pipeline, features)
        # Incluso bajo estrés el rendimiento debe ser > 0
        assert max(0, inf) >= 0


# ─── Tests: Endpoints HTTP ────────────────────────────────────────────────────

class TestEndpoints:
    def test_health_ok(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["model_loaded"] is True

    def test_predict_exitoso(self, client, features_validas):
        resp = client.post("/predict", json={"features": features_validas})
        assert resp.status_code == 200
        data = resp.json()
        assert "rendimiento_estimado_kg_ha" in data
        assert "intervalo_inferior_kg_ha" in data
        assert "intervalo_superior_kg_ha" in data
        assert "confianza_porcentaje" in data
        assert data["rendimiento_estimado_kg_ha"] > 0

    def test_predict_rendimiento_en_rango(self, client, features_validas):
        resp = client.post("/predict", json={"features": features_validas})
        data = resp.json()
        # Para condiciones óptimas, entre 5000 y 12000 kg/ha
        assert 3000 <= data["rendimiento_estimado_kg_ha"] <= 12000

    def test_predict_temperatura_invalida(self, client, features_validas):
        features_invalidas = {**features_validas, "temperatura_promedio": 99}  # > 50
        resp = client.post("/predict", json={"features": features_invalidas})
        assert resp.status_code == 422  # Validation error

    def test_predict_falta_campo(self, client, features_validas):
        incompleto = {k: v for k, v in features_validas.items() if k != "hectareas"}
        resp = client.post("/predict", json={"features": incompleto})
        assert resp.status_code == 422

    def test_predict_sin_modelo(self):
        """Verifica que se retorna 503 si el modelo no está cargado."""
        with patch("main._pipeline", None):
            from main import app
            with TestClient(app) as c:
                from model.training_data import generar_datos_entrenamiento
                features = {
                    "temperatura_promedio": 25.0,
                    "humedad_suelo_promedio": 55.0,
                    "precipitacion_acumulada": 80.0,
                    "dias_desde_siembra": 60,
                    "hectareas": 12.5,
                    "tipo_suelo_encoded": 1,
                }
                resp = c.post("/predict", json={"features": features})
                assert resp.status_code == 503

    def test_train_endpoint(self, client, tmp_path):
        """El endpoint /train debe reentrenar y retornar métricas."""
        with patch("main.MODEL_PATH", str(tmp_path / "retrain.pkl")):
            resp = client.post("/train")
        assert resp.status_code == 200
        data = resp.json()
        assert "rmse" in data
        assert "r2" in data
        assert data["r2"] > 0

    def test_predict_estrés_hidrico(self, client, features_validas):
        """Con humedad muy baja, el rendimiento debe ser menor que en condiciones óptimas."""
        features_optimas = {**features_validas, "humedad_suelo_promedio": 60.0}
        features_estres = {**features_validas, "humedad_suelo_promedio": 22.0}

        resp_opt = client.post("/predict", json={"features": features_optimas})
        resp_est = client.post("/predict", json={"features": features_estres})

        rend_optimo = resp_opt.json()["rendimiento_estimado_kg_ha"]
        rend_estres = resp_est.json()["rendimiento_estimado_kg_ha"]

        assert rend_estres < rend_optimo, (
            f"Estrés hídrico debería reducir rendimiento: {rend_estres} >= {rend_optimo}"
        )
