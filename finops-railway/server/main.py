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

from rofex_client import (
    initialize, ensure_initialized, get_quotes, get_raw_quote,
    get_instrument_list, _instrument_map, _env_label, _rest_url, _ws_url
)

app = FastAPI(title="FinOps Registry API", version="1.0.0")


@app.on_event("startup")
def startup():
    try:
        initialize()
    except Exception as e:
        print(f"✗ Startup init failed (will retry on first request): {e}")


# ── API Endpoints ────────────────────────────────────────────

@app.get("/api/health")
def health():
    ok, err = ensure_initialized()
    return {
        "ok": ok,
        "env": _env_label,
        "rest_url": _rest_url or "(pyRofex default)",
        "ws_url": _ws_url or "(pyRofex default)",
        "instruments_loaded": len(_instrument_map),
        "error": err,
        "has_credentials": all([
            os.environ.get("ROFEX_USER"),
            os.environ.get("ROFEX_PASSWORD"),
            os.environ.get("ROFEX_ACCOUNT"),
        ]),
    }


@app.get("/api/quotes")
def quotes(symbols: str = Query(..., description="Comma-separated tickers")):
    """Always returns 200. Per-symbol errors in each symbol's 'error' field."""
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if not symbol_list:
        return {"asof": datetime.now(timezone.utc).isoformat(), "symbols": {}}
    if len(symbol_list) > 50:
        symbol_list = symbol_list[:50]

    try:
        data = get_quotes(symbol_list)
    except Exception as e:
        data = {s: {"error": str(e)} for s in symbol_list}

    return {
        "asof": datetime.now(timezone.utc).isoformat(),
        "symbols": data,
    }


@app.get("/api/debug/{symbol}")
def debug_symbol(symbol: str):
    """Raw pyRofex response + env info for a single symbol."""
    return get_raw_quote(symbol.upper())


@app.get("/api/instruments")
def instruments(q: str = Query("", description="Filter text")):
    """List discovered instruments, optionally filtered."""
    return {
        "total_mapped": len(_instrument_map),
        "instruments": get_instrument_list(q),
    }


@app.get("/api/entries")
def list_entries():
    import pyRofex
    members = [m for m in dir(pyRofex.MarketDataEntry) if not m.startswith("_")]
    return {"entries": members}


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
