"""
byma_open_client.py – Open BYMA Data client via PyOBD.
Provides delayed (~20 min) market data without credentials.

Env vars:
  BYMA_TTL_SECONDS  – cache TTL in seconds (default 60)
"""

import os
import time
import traceback

# ── State ────────────────────────────────────────────────────
_cache = {}        # key -> {"data": ..., "ts": float}
_ttl = None
_pyobd_available = False
_obd = None
_init_error = None
_sample_keys = None  # stored on first fetch for debugging


def _get_ttl():
    global _ttl
    if _ttl is None:
        _ttl = int(os.environ.get("BYMA_TTL_SECONDS", "60"))
    return _ttl


def _init_pyobd():
    global _pyobd_available, _obd, _init_error
    if _obd is not None:
        return True
    try:
        from PyOBD import openBYMAdata
        _obd = openBYMAdata()
        _pyobd_available = True
        print("✓ PyOBD initialized")
        return True
    except Exception as e:
        _init_error = f"PyOBD init failed: {e}"
        print(f"✗ {_init_error}")
        return False


# ── Cache helpers ────────────────────────────────────────────
def _cache_get(key):
    if key in _cache:
        entry = _cache[key]
        if time.time() - entry["ts"] < _get_ttl():
            return entry["data"]
    return None


def _cache_set(key, data):
    _cache[key] = {"data": data, "ts": time.time()}


# ── Core: fetch bonds ───────────────────────────────────────
def _fetch_bonds_raw():
    """Fetch all bonds from PyOBD. Returns list of dicts (raw rows)."""
    global _sample_keys

    cached = _cache_get("bonds_raw")
    if cached is not None:
        return cached

    if not _init_pyobd():
        raise RuntimeError(_init_error or "PyOBD not available")

    try:
        result = _obd.get_bonds()
    except Exception as e:
        raise RuntimeError(f"PyOBD get_bonds() failed: {e}")

    # result could be a DataFrame or list of dicts
    rows = []
    if hasattr(result, "to_dict"):
        # It's a pandas DataFrame
        rows = result.to_dict("records")
    elif isinstance(result, list):
        rows = result
    elif isinstance(result, dict):
        rows = [result]
    else:
        raise RuntimeError(f"Unexpected PyOBD result type: {type(result)}")

    # Log sample keys on first fetch
    if rows and _sample_keys is None:
        _sample_keys = list(rows[0].keys())
        print(f"  PyOBD bonds sample keys: {_sample_keys}")
        print(f"  PyOBD bonds sample row: {rows[0]}")
        print(f"  PyOBD bonds total rows: {len(rows)}")

    _cache_set("bonds_raw", rows)
    return rows


# ── Defensive field mapping ──────────────────────────────────
# PyOBD field names may vary; try multiple candidates
_FIELD_MAP = {
    "symbol": ["symbol", "simbolo", "ticker", "Symbol", "SYMBOL"],
    "last": ["last", "ultimo", "price", "px_last", "Last", "LAST", "ultimoPrecio"],
    "bid": ["bid", "puntaCompra", "bestBid", "Bid", "BID", "precioCompra"],
    "offer": ["offer", "puntaVenta", "bestAsk", "ask", "Ask", "Offer", "OFFER", "precioVenta"],
    "vol_amount": ["monto", "volumenMonto", "amount", "MontoOperado", "montoOperado", "tradeAmount"],
    "vol_vn": ["volume", "volumen", "nominal", "vn", "volumenNominal", "Volume", "VOLUME", "cantidadOperada"],
    "description": ["description", "descripcion", "name", "denominacion", "Descripcion"],
    "settlement": ["settlement", "plazo", "vencimiento", "settl"],
}


def _extract_field(row, field_name):
    """Try multiple candidate keys for a field. Return value or None."""
    candidates = _FIELD_MAP.get(field_name, [field_name])
    for key in candidates:
        if key in row:
            val = row[key]
            if val is not None and val != "" and val != 0:
                return val
    return None


def _safe_float(val):
    if val is None:
        return None
    try:
        f = float(val)
        return f if f != 0 else None
    except (ValueError, TypeError):
        return None


# ── Public API ───────────────────────────────────────────────

def get_bonds():
    """Return all bonds (cached)."""
    return _fetch_bonds_raw()


def quotes_for(symbols: list[str]) -> dict:
    """Get quotes for specific symbols from Open BYMA data."""
    try:
        rows = _fetch_bonds_raw()
    except Exception as e:
        return {s: _empty_quote(error=str(e)) for s in symbols}

    # Build a lookup by symbol (case-insensitive)
    lookup = {}
    for row in rows:
        sym = _extract_field(row, "symbol")
        if sym:
            lookup[str(sym).upper().strip()] = row

    results = {}
    for symbol in symbols:
        key = symbol.upper().strip()
        if key in lookup:
            row = lookup[key]
            results[symbol] = {
                "last": _safe_float(_extract_field(row, "last")),
                "bid": _safe_float(_extract_field(row, "bid")),
                "offer": _safe_float(_extract_field(row, "offer")),
                "vol_amount": _safe_float(_extract_field(row, "vol_amount")),
                "vol_vn": _safe_float(_extract_field(row, "vol_vn")),
                "source": "open-bymadata",
            }
        else:
            results[symbol] = _empty_quote(error="symbol not found in Open BYMA")

    return results


def raw_row(symbol: str) -> dict:
    """Return raw row for a symbol (for debugging field names)."""
    try:
        rows = _fetch_bonds_raw()
    except Exception as e:
        return {"error": str(e)}

    for row in rows:
        sym = _extract_field(row, "symbol")
        if sym and str(sym).upper().strip() == symbol.upper().strip():
            return {
                "symbol": symbol,
                "raw": row,
                "keys": list(row.keys()),
                "sample_keys_on_init": _sample_keys,
            }

    return {
        "symbol": symbol,
        "error": "not found",
        "sample_keys_on_init": _sample_keys,
        "total_rows": len(rows),
    }


def list_bonds(filter_text: str = "", limit: int = 200) -> list:
    """Return simplified list of bonds, optionally filtered."""
    try:
        rows = _fetch_bonds_raw()
    except Exception as e:
        return []

    results = []
    for row in rows:
        sym = _extract_field(row, "symbol")
        if not sym:
            continue
        sym_str = str(sym).strip()
        if filter_text and filter_text.upper() not in sym_str.upper():
            continue
        results.append({
            "symbol": sym_str,
            "last": _safe_float(_extract_field(row, "last")),
            "description": _extract_field(row, "description") or "",
            "settlement": _extract_field(row, "settlement") or "",
        })

    return sorted(results, key=lambda x: x["symbol"])[:limit]


def health() -> dict:
    """Return health/status info."""
    cached_bonds = _cache.get("bonds_raw")
    return {
        "ok": _pyobd_available or _obd is not None,
        "pyobd_available": _pyobd_available,
        "init_error": _init_error,
        "cache_entries": len(_cache),
        "bonds_cached": cached_bonds is not None,
        "bonds_cached_rows": len(cached_bonds["data"]) if cached_bonds else 0,
        "bonds_cache_age_s": round(time.time() - cached_bonds["ts"], 1) if cached_bonds else None,
        "ttl_seconds": _get_ttl(),
        "sample_keys": _sample_keys,
    }


def _empty_quote(error=None):
    q = {
        "last": None, "bid": None, "offer": None,
        "vol_amount": None, "vol_vn": None,
        "source": "open-bymadata",
    }
    if error:
        q["error"] = error
    return q
