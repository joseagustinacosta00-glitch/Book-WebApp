# FinOps Registry

Webapp para registro de operaciones BYMA con market data en vivo via pyRofex.

## 🚀 Deploy en Railway (100% nube)

### Paso 1: Subir a GitHub
1. Crear un repositorio nuevo en github.com (puede ser privado)
2. Subir estos archivos al repo

### Paso 2: Deploy en Railway
1. Ir a [railway.app](https://railway.app) → Login con GitHub
2. **New Project** → **Deploy from GitHub Repo** → elegir tu repo
3. Railway detecta el proyecto automáticamente (usa `nixpacks.toml`)

### Paso 3: Variables de entorno
En el servicio desplegado, ir a **Variables** y agregar:

```
ROFEX_USER=tu_usuario
ROFEX_PASSWORD=tu_password
ROFEX_ACCOUNT=tu_cuenta
ROFEX_ENV=REMARKET
```

### Paso 4: Generar dominio
En **Settings** → **Networking** → **Generate Domain**

¡Listo! Tu app corre en `https://tu-app.up.railway.app`

## 📁 Estructura

```
├── index.html              # Entry point
├── package.json            # Frontend deps
├── vite.config.js          # Build config (output → server/dist)
├── railway.json            # Railway deploy config
├── nixpacks.toml           # Build: Node + Python
├── src/
│   ├── main.jsx
│   ├── App.jsx             # Toda la app React
│   ├── index.css
│   └── config/
│       └── curves.js       # Configuración de curvas Mercado
└── server/
    ├── main.py             # FastAPI (API + sirve frontend)
    ├── rofex_client.py     # Wrapper pyRofex
    └── requirements.txt    # Python deps
```

## 🖥️ Desarrollo local (opcional)

Terminal 1 (backend):
```bash
cd server
pip install -r requirements.txt
cp .env.example .env  # completar credenciales
uvicorn main:app --reload --port 8000
```

Terminal 2 (frontend):
```bash
npm install
npm run dev
```

Abrir: http://localhost:5173

## Solapas

- **Dashboard**: Posición consolidada T+0, T+1, Maturity
- **Mercado**: Market data live (Bonares, Globales, Bopreales)
- **Registro**: Grilla tipo Excel para cargar operaciones
- **Base de Instrumentos**: ABM de tickers por familia
- **Posición & PNL**: Próximamente
