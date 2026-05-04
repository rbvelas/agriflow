# 🌾 AgriFlow — Sistema de Agricultura de Precisión

AgriFlow es una plataforma integral de agricultura de precisión diseñada para optimizar la gestión hídrica y predecir rendimientos de cultivos mediante Inteligencia Artificial (Ensemble Learning), automatización de flujos de trabajo con n8n y una interfaz moderna de alta fidelidad.

---

## 🛠️ Requisitos Previos

Antes de comenzar, asegúrese de tener instaladas las siguientes herramientas con sus versiones mínimas:

| Herramienta | Versión Mínima | Comando de Verificación |
| :--- | :--- | :--- |
| **Node.js** | v20.x.x | `node -v` |
| **npm** | v10.x.x | `npm -v` |
| **Python** | 3.11.x | `python --version` |
| **PostgreSQL** | 15.x | `psql --version` |
| **Docker** | 24.x.x | `docker -v` |
| **Docker Compose** | v2.x.x | `docker compose version` |

---

## 🏗️ Estructura del Proyecto

```text
agriflow/
├── frontend/          # Next.js 15 (App Router + tRPC Client)
├── backend/           # NestJS (tRPC Server + PostgreSQL + TypeORM)
├── ml-service/        # FastAPI (Modelos de Stacking ML + scikit-learn)
├── workflows/         # Exportaciones JSON de n8n
└── docker-compose.yml # Orquestación de servicios
```

---

## 📋 Guía de Instalación Paso a Paso

### 1. Base de Datos (PostgreSQL)

1. **Crear base de datos y usuario**:
   ```sql
   -- Ejecutar en su cliente SQL o psql
   CREATE DATABASE agriflow;
   CREATE USER agriflow_user WITH ENCRYPTED PASSWORD 'agriflow_pass';
   GRANT ALL PRIVILEGES ON DATABASE agriflow TO agriflow_user;
   -- Conectarse a la DB y habilitar UUIDs
   \c agriflow
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```

### 2. Backend (NestJS)

1. **Navegar e instalar**:
   ```bash
   cd backend
   npm install
   ```
2. **Configurar variables de entorno**:
   Cree un archivo `.env` en `backend/` basándose en el siguiente ejemplo:
   ```env
   PORT=3001
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_USER=agriflow_user
   POSTGRES_PASSWORD=agriflow_pass
   POSTGRES_DB=agriflow
   JWT_SECRET=su_secreto_para_tokens
   JWT_EXPIRES_IN=7d
   N8N_WEBHOOK_SECRET=token_compartido_con_n8n
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ML_SERVICE_URL=http://localhost:8000
   ```
3. **Iniciar servidor**:
   ```bash
   npm run start:dev
   ```

### 3. Machine Learning Service (FastAPI)

1. **Configurar entorno Python**:
   ```bash
   cd ml-service
   python -m venv venv
   # Windows:
   .\venv\Scripts\activate
   # Linux/Mac:
   source venv/bin/activate
   ```
2. **Instalar dependencias**:
   ```bash
   pip install -r requirements.txt
   ```
3. **Iniciar servicio**:
   ```bash
   fastapi dev main.py --port 8000
   ```

### 4. Frontend (Next.js)

1. **Navegar e instalar**:
   ```bash
   cd frontend
   npm install
   ```
2. **Configurar variables de entorno**:
   Cree un archivo `.env.local` en `frontend/`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```
3. **Iniciar desarrollo**:
   ```bash
   npm run dev
   ```

### 5. Automatización (n8n)

1. **Levantar n8n vía Docker**:
   ```bash
   docker run -it --rm --name n8n -p 5678:5678 n8nio/n8n
   ```
2. **Importar Workflows**:
   - Acceda a `http://localhost:5678`.
   - Vaya a **Workflows > Import from File**.
   - Seleccione los archivos en la carpeta `/workflows/`.
3. **Configurar Credenciales**:
   - En n8n, cree una credencial de **PostgreSQL** con los datos del paso 1.
   - Configure el **Header Auth** con la clave `Authorization` y el valor `Bearer su_token_de_n8n` (definido en el `.env` del backend).

---

## 🚦 Orden de Ejecución Sugerido

Para evitar errores de conexión, inicie los servicios en este orden:
1. **PostgreSQL** (Debe estar activo y accesible).
2. **Backend** (Realiza la conexión inicial y valida esquemas).
3. **ML Service** (Provee los endpoints de predicción al backend).
4. **Frontend** (Interfaz de usuario).
5. **n8n** (Ejecuta los flujos de datos en segundo plano).

---

## 🔍 Verificación del Sistema

| Componente | Prueba de Funcionamiento |
| :--- | :--- |
| **Backend** | Abrir `http://localhost:3001/api/auth/perfil` (Debe dar 401 Unauthorized). |
| **Frontend** | Abrir `http://localhost:3000`. Debe cargar la pantalla de Login. |
| **ML Service** | Abrir `http://localhost:8000/health`. Debe responder `{"status": "ok"}`. |
| **n8n** | Abrir `http://localhost:5678`. Debe cargar el editor de nodos. |

---

## 🛠️ Solución de Problemas Comunes

- **Error: `EADDRINUSE :::3001`**: El puerto del backend está ocupado. Use `netstat -ano | findstr :3001` para encontrar el PID y `taskkill /F /PID <PID>` para liberarlo.
- **Error: `Failed to fetch` en Frontend**: Verifique que el backend esté corriendo en el puerto 3001 y que `NEXT_PUBLIC_API_URL` esté bien configurado.
- **Error: `ModuleNotFoundError` en ML Service**: Asegúrese de que el entorno virtual (`venv`) esté activado antes de instalar los requirements.

---

## 📋 Licencia

Distribuido bajo la Licencia MIT. Ver `LICENSE` para más información.

---
**AgriFlow** — *Tecnología inteligente para el futuro del campo.*
