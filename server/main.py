"""
main.py – FastAPI backend for FinOps Registry.
Serves both the API (/api/*) and the built frontend (static files).
"""

import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Query, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

load_dotenv()

app = FastAPI(title="FinOps Registry API", version="1.0.0")


@app.on_event("startup")
def startup():
    print("✓ FinOps Registry API starting (BYMA Open only)")


# ── BYMA Open Data Endpoints ────────────────────────────────

import byma_open_client as byma

@app.get("/api/health")
def api_health():
    return byma.health()

@app.get("/api/byma/health")
def byma_health():
    return byma.health()


@app.get("/api/byma/quotes")
def byma_quotes(symbols: str = Query(..., description="Comma-separated tickers")):
    """Always returns 200. Per-symbol errors in each symbol's 'error' field."""
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if not symbol_list:
        return {"asof": datetime.now(timezone.utc).isoformat(), "source": "open-bymadata (delayed)", "symbols": {}}
    if len(symbol_list) > 100:
        symbol_list = symbol_list[:100]

    try:
        data = byma.quotes_for(symbol_list)
    except Exception as e:
        data = {s: {"error": str(e)} for s in symbol_list}

    return {
        "asof": datetime.now(timezone.utc).isoformat(),
        "source": "open-bymadata (delayed)",
        "symbols": data,
    }


@app.get("/api/byma/raw")
def byma_raw(symbol: str = Query(..., description="Single ticker")):
    """Raw PyOBD row for debugging field names."""
    return byma.raw_row(symbol.strip().upper())


@app.get("/api/byma/bonds")
def byma_bonds(q: str = Query("", description="Filter text"), limit: int = Query(200)):
    """List available bonds from Open BYMA, optionally filtered."""
    bonds = byma.list_bonds(q, limit)
    return {
        "total": len(bonds),
        "filter": q,
        "bonds": bonds,
    }


@app.get("/api/byma/cauciones")
def byma_cauciones(max_days: int = Query(7)):
    """Cauciones (repos) data from Open BYMA, parsed by currency."""
    return byma.get_cauciones_parsed(max_days)


@app.get("/api/byma/cauciones/raw")
def byma_cauciones_raw():
    """Raw cauciones data for debugging field names."""
    return byma.raw_caucion()


# ── Serve Frontend Static Files ──────────────────────────────
DIST_DIR = Path(__file__).parent / "dist"

if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        file_path = DIST_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(DIST_DIR / "index.html")
