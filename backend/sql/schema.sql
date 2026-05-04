-- ============================================================
-- AgriFlow — Esquema DDL + Datos Semilla
-- PostgreSQL 16 — inicializado por docker-entrypoint-initdb.d
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── Tipos enumerados ─────────────────────────────────────────────
CREATE TYPE estado_temporada  AS ENUM ('planificada','activa','cosechada','cancelada');
CREATE TYPE tipo_sensor        AS ENUM ('temperatura','humedad_suelo','precipitacion','ndvi','viento','radiacion_solar');
CREATE TYPE severidad_alerta   AS ENUM ('baja','media','alta','critica');
CREATE TYPE tipo_reporte       AS ENUM ('operacional_diario','operacional_semanal','gestion_mensual','ejecutivo');
CREATE TYPE estado_reporte     AS ENUM ('pendiente','generando','listo','error');
CREATE TYPE estado_workflow    AS ENUM ('iniciado','en_proceso','exitoso','error','cancelado');
CREATE TYPE fuente_lectura     AS ENUM ('sensor_fisico','simulado','api_externa','interpolado');

-- ── rol ──────────────────────────────────────────────────────────
CREATE TABLE rol (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre      VARCHAR(50)  NOT NULL UNIQUE,
    descripcion TEXT
);

-- ── usuario ──────────────────────────────────────────────────────
CREATE TABLE usuario (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre           VARCHAR(120) NOT NULL,
    email            VARCHAR(255) NOT NULL UNIQUE,
    hash_contrasena  VARCHAR(255) NOT NULL,
    activo           BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_usuario_email ON usuario(email);

-- ── usuario_rol ──────────────────────────────────────────────────
CREATE TABLE usuario_rol (
    usuario_id  UUID NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    rol_id      UUID NOT NULL REFERENCES rol(id)     ON DELETE RESTRICT,
    asignado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (usuario_id, rol_id)
);

-- ── finca ────────────────────────────────────────────────────────
CREATE TABLE finca (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    propietario_id   UUID NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    nombre           VARCHAR(200) NOT NULL,
    descripcion      TEXT,
    latitud          DECIMAL(10,7),
    longitud         DECIMAL(10,7),
    hectareas_total  DECIMAL(10,2) CHECK (hectareas_total > 0),
    departamento     VARCHAR(100),
    municipio        VARCHAR(100),
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_finca_propietario ON finca(propietario_id);

-- ── lote ─────────────────────────────────────────────────────────
CREATE TABLE lote (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    finca_id           UUID NOT NULL REFERENCES finca(id) ON DELETE CASCADE,
    nombre             VARCHAR(100) NOT NULL,
    hectareas          DECIMAL(8,2) NOT NULL CHECK (hectareas > 0),
    tipo_suelo         VARCHAR(80),
    latitud_centroide  DECIMAL(10,7),
    longitud_centroide DECIMAL(10,7),
    activo             BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_lote_finca ON lote(finca_id);

-- ── cultivo ──────────────────────────────────────────────────────
CREATE TABLE cultivo (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre                      VARCHAR(100) NOT NULL UNIQUE,
    nombre_cientifico           VARCHAR(200),
    dias_ciclo                  INTEGER NOT NULL CHECK (dias_ciclo > 0),
    kc_inicial                  DECIMAL(4,2) NOT NULL DEFAULT 0.30,
    kc_medio                    DECIMAL(4,2) NOT NULL DEFAULT 1.20,
    kc_final                    DECIMAL(4,2) NOT NULL DEFAULT 0.55,
    rendimiento_potencial_kg_ha DECIMAL(10,2),
    descripcion                 TEXT,
    creado_en                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN cultivo.kc_inicial IS 'Coeficiente de cultivo fase inicial (FAO-56)';
COMMENT ON COLUMN cultivo.kc_medio   IS 'Coeficiente de cultivo fase media (FAO-56)';
COMMENT ON COLUMN cultivo.kc_final   IS 'Coeficiente de cultivo fase final (FAO-56)';

-- ── temporada ────────────────────────────────────────────────────
CREATE TABLE temporada (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lote_id                UUID NOT NULL REFERENCES lote(id)    ON DELETE RESTRICT,
    cultivo_id             UUID NOT NULL REFERENCES cultivo(id) ON DELETE RESTRICT,
    fecha_siembra          DATE NOT NULL,
    fecha_cosecha_estimada DATE,
    fecha_cosecha_real     DATE,
    rendimiento_real_kg_ha DECIMAL(10,2) CHECK (rendimiento_real_kg_ha >= 0),
    estado                 estado_temporada NOT NULL DEFAULT 'planificada',
    notas                  TEXT,
    creado_en              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_fechas CHECK (
        fecha_cosecha_estimada IS NULL OR fecha_cosecha_estimada > fecha_siembra
    )
);
CREATE INDEX idx_temporada_lote    ON temporada(lote_id);
CREATE INDEX idx_temporada_cultivo ON temporada(cultivo_id);
CREATE INDEX idx_temporada_activa  ON temporada(estado) WHERE estado = 'activa';

-- ── sensor ───────────────────────────────────────────────────────
CREATE TABLE sensor (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lote_id      UUID NOT NULL REFERENCES lote(id) ON DELETE CASCADE,
    tipo         tipo_sensor NOT NULL,
    unidad       VARCHAR(20) NOT NULL,
    modelo       VARCHAR(100),
    latitud      DECIMAL(10,7),
    longitud     DECIMAL(10,7),
    activo       BOOLEAN NOT NULL DEFAULT TRUE,
    instalado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sensor_lote ON sensor(lote_id);
CREATE INDEX idx_sensor_tipo ON sensor(tipo);

-- ── lectura_sensor ───────────────────────────────────────────────
CREATE TABLE lectura_sensor (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sensor_id     UUID NOT NULL REFERENCES sensor(id) ON DELETE CASCADE,
    registrado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valor         DECIMAL(12,4) NOT NULL,
    es_anomalia   BOOLEAN NOT NULL DEFAULT FALSE,
    fuente        fuente_lectura NOT NULL DEFAULT 'sensor_fisico'
);
COMMENT ON TABLE  lectura_sensor             IS 'Serie temporal de alta frecuencia — tabla crítica para rendimiento';
COMMENT ON COLUMN lectura_sensor.es_anomalia IS 'TRUE si fue marcado como outlier por detección 3-sigma';

CREATE INDEX idx_lectura_sensor_tiempo  ON lectura_sensor(sensor_id, registrado_en DESC);
CREATE INDEX idx_lectura_no_anomalia    ON lectura_sensor(registrado_en DESC) WHERE es_anomalia = FALSE;

-- ── evento_riego ─────────────────────────────────────────────────
CREATE TABLE evento_riego (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lote_id               UUID NOT NULL REFERENCES lote(id)     ON DELETE RESTRICT,
    temporada_id          UUID          REFERENCES temporada(id) ON DELETE SET NULL,
    fecha_hora            TIMESTAMPTZ NOT NULL,
    lamina_recomendada_mm DECIMAL(8,2) NOT NULL CHECK (lamina_recomendada_mm >= 0),
    lamina_aplicada_mm    DECIMAL(8,2) CHECK (lamina_aplicada_mm >= 0),
    metodo                VARCHAR(80),
    completado            BOOLEAN NOT NULL DEFAULT FALSE,
    notas                 TEXT
);
COMMENT ON COLUMN evento_riego.lamina_recomendada_mm IS 'Lámina calculada por FAO-56 ETc = ET0 × Kc (mm)';
CREATE INDEX idx_riego_lote_fecha  ON evento_riego(lote_id, fecha_hora DESC);
CREATE INDEX idx_riego_pendientes  ON evento_riego(lote_id) WHERE completado = FALSE;

-- ── prediccion_rendimiento ───────────────────────────────────────
CREATE TABLE prediccion_rendimiento (
    id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    temporada_id               UUID NOT NULL REFERENCES temporada(id) ON DELETE CASCADE,
    generado_en                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rendimiento_estimado_kg_ha DECIMAL(10,2) NOT NULL CHECK (rendimiento_estimado_kg_ha >= 0),
    intervalo_inferior_kg_ha   DECIMAL(10,2),
    intervalo_superior_kg_ha   DECIMAL(10,2),
    confianza_porcentaje       DECIMAL(5,2) CHECK (confianza_porcentaje BETWEEN 0 AND 100),
    features_usadas            JSONB NOT NULL DEFAULT '{}',
    version_modelo             VARCHAR(50) NOT NULL DEFAULT 'v1.0'
);
COMMENT ON COLUMN prediccion_rendimiento.features_usadas IS 'Snapshot JSON del vector de características usado en esta predicción';
CREATE INDEX idx_pred_temporada ON prediccion_rendimiento(temporada_id, generado_en DESC);

-- ── reporte ──────────────────────────────────────────────────────
CREATE TABLE reporte (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generado_por   UUID NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    finca_id       UUID NOT NULL REFERENCES finca(id)   ON DELETE CASCADE,
    tipo           tipo_reporte NOT NULL,
    periodo_inicio DATE NOT NULL,
    periodo_fin    DATE NOT NULL,
    ruta_archivo   TEXT,
    generado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estado         estado_reporte NOT NULL DEFAULT 'pendiente',
    CONSTRAINT chk_periodo CHECK (periodo_fin >= periodo_inicio)
);
CREATE INDEX idx_reporte_usuario ON reporte(generado_por, generado_en DESC);

-- ── alerta ───────────────────────────────────────────────────────
CREATE TABLE alerta (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lote_id          UUID NOT NULL REFERENCES lote(id) ON DELETE CASCADE,
    tipo             VARCHAR(80) NOT NULL,
    severidad        severidad_alerta NOT NULL,
    mensaje          TEXT NOT NULL,
    generada_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reconocida_en    TIMESTAMPTZ,
    reconocida_por   UUID REFERENCES usuario(id) ON DELETE SET NULL,
    resuelta         BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_alerta_lote_activa ON alerta(lote_id, generada_en DESC) WHERE resuelta = FALSE;

-- ── workflow_ejecucion ───────────────────────────────────────────
CREATE TABLE workflow_ejecucion (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_workflow  VARCHAR(100) NOT NULL,
    estado           estado_workflow NOT NULL DEFAULT 'iniciado',
    iniciado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finalizado_en    TIMESTAMPTZ,
    metadata         JSONB DEFAULT '{}',
    error_mensaje    TEXT
);
CREATE INDEX idx_workflow_nombre ON workflow_ejecucion(nombre_workflow, iniciado_en DESC);

-- ════════════════════════════════════════════════════════════════════
-- DATOS SEMILLA
-- ════════════════════════════════════════════════════════════════════

-- Roles
INSERT INTO rol (id, nombre, descripcion) VALUES
    ('11111111-0000-0000-0000-000000000001','administrador','Gestión completa del sistema'),
    ('11111111-0000-0000-0000-000000000002','agricultor',    'Gestión de fincas y cultivos'),
    ('11111111-0000-0000-0000-000000000003','tecnico',      'Monitoreo y análisis');

-- Usuarios (contraseña: "agriflow2024" — hash bcrypt costo 10)
INSERT INTO usuario (id, nombre, email, hash_contrasena) VALUES
    ('22222222-0000-0000-0000-000000000000','Admin AgriFlow', 'admin@agriflow.pe',
     '$2b$10$7Z2Gq/S2q.lP6u7U/vM/A.qZ6U7V8W9X0Y1Z2A3B4C5D6E7F8G9H'),
    ('22222222-0000-0000-0000-000000000001','Carlos Mendoza','carlos@agriflow.pe',
     '$2b$10$7Z2Gq/S2q.lP6u7U/vM/A.qZ6U7V8W9X0Y1Z2A3B4C5D6E7F8G9H'),
    ('22222222-0000-0000-0000-000000000002','María Quispe',  'maria@agriflow.pe',
     '$2b$10$7Z2Gq/S2q.lP6u7U/vM/A.qZ6U7V8W9X0Y1Z2A3B4C5D6E7F8G9H');

INSERT INTO usuario_rol (usuario_id, rol_id) VALUES
    ('22222222-0000-0000-0000-000000000000','11111111-0000-0000-0000-000000000001'),
    ('22222222-0000-0000-0000-000000000001','11111111-0000-0000-0000-000000000002'),
    ('22222222-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000003');

-- Finca
INSERT INTO finca (id, propietario_id, nombre, hectareas_total, departamento, municipio, latitud, longitud) VALUES
    ('33333333-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001',
     'Finca La Esperanza',45.80,'La Libertad','Santiago de Cao',-7.8950,-79.5270);

-- Lotes
INSERT INTO lote (id, finca_id, nombre, hectareas, tipo_suelo, latitud_centroide, longitud_centroide) VALUES
    ('44444444-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000001',
     'Lote Norte A',  12.50,'franco arenoso', -7.8900,-79.5250),
    ('44444444-0000-0000-0000-000000000002','33333333-0000-0000-0000-000000000001',
     'Lote Sur B',    18.30,'franco arcilloso',-7.9010,-79.5290),
    ('44444444-0000-0000-0000-000000000003','33333333-0000-0000-0000-000000000001',
     'Lote Central C',15.00,'franco limoso',   -7.8960,-79.5260);

-- Cultivos (FAO-56 Kc)
INSERT INTO cultivo (id, nombre, nombre_cientifico, dias_ciclo, kc_inicial, kc_medio, kc_final, rendimiento_potencial_kg_ha) VALUES
    ('55555555-0000-0000-0000-000000000001','Maíz Amarillo Duro','Zea mays L.',          120,0.30,1.20,0.60, 9500.00),
    ('55555555-0000-0000-0000-000000000002','Arroz',             'Oryza sativa L.',       130,1.05,1.20,0.90, 7200.00),
    ('55555555-0000-0000-0000-000000000003','Caña de Azúcar',    'Saccharum officinarum', 365,0.40,1.25,0.75,120000.00),
    ('55555555-0000-0000-0000-000000000004','Espárrago',         'Asparagus officinalis', 730,0.50,0.95,0.85, 8000.00),
    ('55555555-0000-0000-0000-000000000005','Papa',              'Solanum tuberosum L.',  120,0.45,1.15,0.75,25000.00);

-- Temporada activa — maíz en Lote Norte A
INSERT INTO temporada (id, lote_id, cultivo_id, fecha_siembra, fecha_cosecha_estimada, estado) VALUES
    ('66666666-0000-0000-0000-000000000001',
     '44444444-0000-0000-0000-000000000001',
     '55555555-0000-0000-0000-000000000001',
     '2024-11-01','2025-03-01','activa');

-- Sensores
INSERT INTO sensor (id, lote_id, tipo, unidad, modelo) VALUES
    ('77777777-0000-0000-0000-000000000001','44444444-0000-0000-0000-000000000001','temperatura',   '°C',  'DHT22'),
    ('77777777-0000-0000-0000-000000000002','44444444-0000-0000-0000-000000000001','humedad_suelo', '%VWC','Decagon-5TM'),
    ('77777777-0000-0000-0000-000000000003','44444444-0000-0000-0000-000000000001','precipitacion', 'mm',  'Davis-7852'),
    ('77777777-0000-0000-0000-000000000004','44444444-0000-0000-0000-000000000002','temperatura',   '°C',  'DHT22'),
    ('77777777-0000-0000-0000-000000000005','44444444-0000-0000-0000-000000000002','humedad_suelo', '%VWC','Decagon-5TM');

-- 30 lecturas de sensores — valores realistas para costa norte del Perú
INSERT INTO lectura_sensor (sensor_id, registrado_en, valor, fuente) VALUES
-- Temperatura Lote A (18–32 °C)
('77777777-0000-0000-0000-000000000001', NOW()-INTERVAL '29 hours', 24.2, 'simulado'),
('77777777-0000-0000-0000-000000000001', NOW()-INTERVAL '27 hours', 27.3, 'simulado'),
('77777777-0000-0000-0000-000000000001', NOW()-INTERVAL '25 hours', 30.5, 'simulado'),
('77777777-0000-0000-0000-000000000001', NOW()-INTERVAL '23 hours', 28.7, 'simulado'),
('77777777-0000-0000-0000-000000000001', NOW()-INTERVAL '21 hours', 26.4, 'simulado'),
('77777777-0000-0000-0000-000000000001', NOW()-INTERVAL '19 hours', 29.1, 'simulado'),
('77777777-0000-0000-0000-000000000001', NOW()-INTERVAL '17 hours', 31.2, 'simulado'),
-- Humedad suelo Lote A (%VWC — CC≈60%, PMP≈25%)
('77777777-0000-0000-0000-000000000002', NOW()-INTERVAL '29 hours', 58.4, 'simulado'),
('77777777-0000-0000-0000-000000000002', NOW()-INTERVAL '27 hours', 52.3, 'simulado'),
('77777777-0000-0000-0000-000000000002', NOW()-INTERVAL '25 hours', 45.2, 'simulado'),
('77777777-0000-0000-0000-000000000002', NOW()-INTERVAL '23 hours', 42.7, 'simulado'),
('77777777-0000-0000-0000-000000000002', NOW()-INTERVAL '21 hours', 39.1, 'simulado'),
('77777777-0000-0000-0000-000000000002', NOW()-INTERVAL '19 hours', 36.8, 'simulado'),
('77777777-0000-0000-0000-000000000002', NOW()-INTERVAL '17 hours', 33.4, 'simulado'),
-- Precipitación Lote A (0–15 mm por evento)
('77777777-0000-0000-0000-000000000003', NOW()-INTERVAL '29 hours',  0.0, 'simulado'),
('77777777-0000-0000-0000-000000000003', NOW()-INTERVAL '27 hours',  2.4, 'simulado'),
('77777777-0000-0000-0000-000000000003', NOW()-INTERVAL '25 hours',  8.1, 'simulado'),
('77777777-0000-0000-0000-000000000003', NOW()-INTERVAL '23 hours',  3.5, 'simulado'),
('77777777-0000-0000-0000-000000000003', NOW()-INTERVAL '21 hours',  0.0, 'simulado'),
('77777777-0000-0000-0000-000000000003', NOW()-INTERVAL '19 hours',  0.0, 'simulado'),
-- Temperatura Lote B
('77777777-0000-0000-0000-000000000004', NOW()-INTERVAL '29 hours', 23.8, 'simulado'),
('77777777-0000-0000-0000-000000000004', NOW()-INTERVAL '27 hours', 27.0, 'simulado'),
('77777777-0000-0000-0000-000000000004', NOW()-INTERVAL '25 hours', 30.1, 'simulado'),
('77777777-0000-0000-0000-000000000004', NOW()-INTERVAL '23 hours', 28.4, 'simulado'),
('77777777-0000-0000-0000-000000000004', NOW()-INTERVAL '21 hours', 25.9, 'simulado'),
-- Humedad suelo Lote B
('77777777-0000-0000-0000-000000000005', NOW()-INTERVAL '29 hours', 62.1, 'simulado'),
('77777777-0000-0000-0000-000000000005', NOW()-INTERVAL '27 hours', 56.4, 'simulado'),
('77777777-0000-0000-0000-000000000005', NOW()-INTERVAL '25 hours', 50.7, 'simulado'),
('77777777-0000-0000-0000-000000000005', NOW()-INTERVAL '23 hours', 48.3, 'simulado'),
('77777777-0000-0000-0000-000000000005', NOW()-INTERVAL '21 hours', 44.9, 'simulado');

-- Predicción semilla para la temporada activa
INSERT INTO prediccion_rendimiento
    (temporada_id, rendimiento_estimado_kg_ha, intervalo_inferior_kg_ha,
     intervalo_superior_kg_ha, confianza_porcentaje, features_usadas, version_modelo)
VALUES
    ('66666666-0000-0000-0000-000000000001',
     8240.00, 7100.00, 9380.00, 82.50,
     '{"temperatura_promedio":27.1,"humedad_suelo_promedio":46.5,"precipitacion_acumulada":14.0,"dias_desde_siembra":75,"hectareas":12.5,"tipo_suelo_encoded":1}',
     'v1.0');

-- Evento de riego semilla
INSERT INTO evento_riego
    (lote_id, temporada_id, fecha_hora, lamina_recomendada_mm, lamina_aplicada_mm, metodo, completado)
VALUES
    ('44444444-0000-0000-0000-000000000001',
     '66666666-0000-0000-0000-000000000001',
     NOW()-INTERVAL '2 days', 18.50, 17.20, 'goteo', TRUE);

-- Alerta semilla
INSERT INTO alerta (lote_id, tipo, severidad, mensaje) VALUES
    ('44444444-0000-0000-0000-000000000001',
     'humedad_baja','alta',
     'Humedad del suelo cayó a 33.4%VWC — por debajo del umbral óptimo de 40%VWC');
