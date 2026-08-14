"""Servicio de IA — Gemini API para visión y extracción de entidades de voz.

Todo runtime es $0 usando el pool de Gemini.
"""
import os
import httpx
import json
import base64

GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_VISION_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
GEMINI_TEXT_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

ESPECIES_OBJETIVO = ["congrio", "merluza", "jaiba", "reineta", "corvina"]


def reconocer_especie_imagen(foto_base64: str) -> dict:
    """Reconoce especie + estima peso/tamaño desde foto.

    Returns: {especie, confianza, largo_cm_estimado, peso_kg_estimado}
    Fallback si la API falla: None
    """
    if not GEMINI_KEY:
        return None
    try:
        prompt = f"""Eres un experto en especies marinas de Chile.
Analiza esta foto de una captura de pesca artesanal de Valparaíso.

Identifica la especie (solo una de estas: {', '.join(ESPECIES_OBJETIVO)}).
Estima el largo en cm y peso en kg usando objetos de referencia en la foto si hay.

Responde SOLO en JSON:
{{"especie": "string", "confianza": 0.0-1.0, "largo_cm_estimado": float, "peso_kg_estimado": float}}"""

        image_data = base64.b64decode(foto_base64)

        resp = httpx.post(
            f"{GEMINI_VISION_URL}?key={GEMINI_KEY}",
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{
                    "parts": [
                        {"text": prompt},
                        {"inline_data": {"mime_type": "image/jpeg", "data": base64.b64encode(image_data).decode()}},
                    ]
                }],
                "generationConfig": {"temperature": 0.1, "maxOutputTokens": 200},
            },
            timeout=15,
        )
        if resp.status_code != 200:
            return None

        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        return json.loads(text)
    except Exception:
        return None


def extraer_entidades_voz(texto: str) -> dict:
    """Extrae especie, cantidad y peso desde transcripción de voz.

    Ej: "traje dos congrios de tres kilos cada uno" → {especie: "congrio", cantidad: 2, peso_unitario_kg: 3}
    """
    if not GEMINI_KEY:
        # Fallback: regex básico
        return _extraer_entidades_fallback(texto)

    try:
        prompt = f"""Eres un asistente que extrae datos de captura de pesca.
Del siguiente texto del pescador, extrae especie, cantidad y peso unitario.

Texto: "{texto}"

Especies válidas: {', '.join(ESPECIES_OBJETIVO)}
Responde SOLO en JSON:
{{"especie": "string", "cantidad": int, "peso_unitario_kg": float}}"""

        resp = httpx.post(
            f"{GEMINI_TEXT_URL}?key={GEMINI_KEY}",
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.1, "maxOutputTokens": 150},
            },
            timeout=10,
        )
        if resp.status_code != 200:
            return _extraer_entidades_fallback(texto)

        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        return json.loads(text)
    except Exception:
        return _extraer_entidades_fallback(texto)


def _extraer_entidades_fallback(texto: str) -> dict:
    """Extracción por regex si Gemini falla."""
    texto_lower = texto.lower()
    especie = None
    for esp in ESPECIES_OBJETIVO:
        if esp in texto_lower:
            especie = esp
            break
    if not especie:
        especie = "desconocida"

    import re
    cant_match = re.search(r'(\d+)\s*(?:congrios|merluzas|jaibas|reinetas|corvinas|unidades|pescados)', texto_lower)
    cantidad = int(cant_match.group(1)) if cant_match else 1

    peso_match = re.search(r'(\d+(?:\.\d+)?)\s*kilo', texto_lower)
    peso = float(peso_match.group(1)) if peso_match else 0.0

    return {"especie": especie, "cantidad": cantidad, "peso_unitario_kg": peso}
