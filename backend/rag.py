"""RAG para precio dinámico — consulta señales de mercado y genera predicción explicada.

Usa INACAP API (qwen3-32b, $0) para generar la justificación.
Fallback: reglas puras sin LLM si la API falla.
"""
import os
import httpx
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from models import SenalMercado, ProductoMarketplace

INACAP_KEY = os.getenv("INACAP_API_KEY", "")
INACAP_ENDPOINT = os.getenv("INACAP_ENDPOINT", "https://api-ap-southeast-1.modelarts-maas.com/openai/v1")


def _horas_sin_venta(producto: ProductoMarketplace) -> float:
    """Calcula horas desde publicación (o última actualización) sin venta."""
    ahora = datetime.now(timezone.utc)
    ref = producto.ultima_actualizacion or producto.timestamp_publicacion
    try:
        dt = datetime.fromisoformat(ref.replace("Z", "+00:00"))
        return max(0.0, (ahora - dt).total_seconds() / 3600)
    except Exception:
        return 0.0


def _precio_base_decreciente(producto: ProductoMarketplace, horas: float) -> float:
    """Regla base: cada 2h sin venta, baja 5%. Mínimo 60% del inicial."""
    escalones = int(horas // 2)
    factor = max(0.60, 1.0 - escalones * 0.05)
    return round(producto.precio_inicial * factor, 2)


def _construir_contexto_rag(db: Session, producto: ProductoMarketplace) -> str:
    """Construye contexto de señales de mercado para el LLM."""
    senales = db.query(SenalMercado).all()
    lines = []
    for s in senales:
        lines.append(f"- {s.tipo}: {s.valor} (fuente: {s.fuente}, fecha: {s.fecha})")
    contexto = "\n".join(lines) if lines else "- Sin señales disponibles"

    return f"""Producto en marketplace:
- Especie: {producto.especie}
- Precio inicial: ${producto.precio_inicial}
- Precio actual: ${producto.precio_actual}
- Horas sin venta: {_horas_sin_venta(producto):.1f}
- Estado: {producto.estado}

Señales de mercado (contexto RAG):
{contexto}

Reglas:
- El precio base ya baja 5% cada 2h sin venta (mínimo 60% del inicial).
- Tu trabajo es ajustar la velocidad de la baja y dar una tendencia explicada.
- Considera: si hay alta demanda turística + baja disponibilidad → tendencia alcista (frenar la baja).
- Si hay sobreoferta + clima malo → tendencia bajista (acelerar la baja).
- Responde SOLO en JSON: {{"precio_sugerido": float, "tendencia": "alcista"|"bajista"|"estable", "justificacion": "breve en español"}}"""


def _llm_prediccion(contexto: str) -> dict | None:
    """Consulta qwen3-32b vía INACAP API. Retorna None si falla."""
    if not INACAP_KEY:
        return None
    try:
        resp = httpx.post(
            f"{INACAP_ENDPOINT}/chat/completions",
            headers={"Authorization": f"Bearer {INACAP_KEY}", "Content-Type": "application/json"},
            json={
                "model": "qwen3-32b",
                "messages": [
                    {"role": "system", "content": "Eres un analista de mercado para pesca artesanal en Valparaíso. Respondes SOLO en JSON válido."},
                    {"role": "user", "content": contexto},
                ],
                "temperature": 0.3,
                "max_tokens": 300,
            },
            timeout=10,
        )
        if resp.status_code != 200:
            return None
        content = resp.json()["choices"][0]["message"]["content"]
        # Extraer JSON del contenido
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        return json.loads(content)
    except Exception:
        return None


def calcular_prediccion(db: Session, producto: ProductoMarketplace) -> dict:
    """Punto de entrada: calcula predicción de precio con RAG + justificación.

    Returns: {precio_sugerido, tendencia, justificacion}
    """
    horas = _horas_sin_venta(producto)
    precio_base = _precio_base_decreciente(producto, horas)

    # Intentar RAG con LLM
    contexto = _construir_contexto_rag(db, producto)
    llm_result = _llm_prediccion(contexto)

    if llm_result and "precio_sugerido" in llm_result:
        # Validar que el LLM no sugiera un precio absurdo
        sugerido = float(llm_result["precio_sugerido"])
        if producto.precio_inicial * 0.5 <= sugerido <= producto.precio_inicial * 1.2:
            return {
                "precio_sugerido": round(sugerido, 2),
                "tendencia": llm_result.get("tendencia", "estable"),
                "justificacion": llm_result.get("justificacion", "Análisis de mercado vía RAG."),
            }

    # Fallback: reglas puras sin LLM
    if horas < 2:
        tendencia = "estable"
        just = "Producto recién publicado, precio estable."
    elif horas < 6:
        tendencia = "bajista"
        just = f"Baja progresiva: {horas:.1f}h sin venta, descuento del {int((1 - precio_base/producto.precio_inicial)*100)}%."
    else:
        tendencia = "bajista"
        just = f"Riesgo de merma: {horas:.1f}h sin venta. Precio reducido al {int(precio_base/producto.precio_inicial*100)}% del inicial."

    return {"precio_sugerido": precio_base, "tendencia": tendencia, "justificacion": just}


def actualizar_precio(db: Session, producto: ProductoMarketplace) -> float:
    """Actualiza precio_actual del producto según predicción. Retorna nuevo precio."""
    pred = calcular_prediccion(db, producto)
    producto.precio_actual = pred["precio_sugerido"]
    producto.ultima_actualizacion = datetime.now(timezone.utc).isoformat()
    db.commit()
    return pred["precio_sugerido"]
