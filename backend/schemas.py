"""Pydantic schemas for API."""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CapturaVozIn(BaseModel):
    audio_text: str  # transcripción o texto directo para extraer entidades


class CapturaManualIn(BaseModel):
    pescador_id: int
    especie: str
    peso_kg: float
    largo_cm: Optional[float] = None
    cantidad: int = 1


class CapturaImagenIn(BaseModel):
    pescador_id: int
    foto_base64: str


class CapturaOut(BaseModel):
    id: int
    pescador_id: int
    especie: str
    peso_kg: float
    largo_cm: Optional[float]
    metodo_registro: str
    estado: str
    timestamp: str


class FormularioOut(BaseModel):
    id: int
    captura_id: int
    campos: dict
    estado_envio: str


class ProductoOut(BaseModel):
    id: int
    captura_id: int
    especie: str
    cantidad: int
    precio_inicial: float
    precio_actual: float
    timestamp_publicacion: str
    ultima_actualizacion: str
    estado: str


class PrediccionOut(BaseModel):
    precio_sugerido: float
    tendencia: str  # 'alcista'|'bajista'|'estable'
    justificacion: str


class PedidoIn(BaseModel):
    restaurante_id: int
    especie_solicitada: str
    cantidad: int


class PedidoOut(BaseModel):
    id: int
    restaurante_id: int
    especie_solicitada: str
    cantidad: int
    estado: str


class MatchOut(BaseModel):
    producto_id: int
    especie: str
    cantidad: int
    precio_actual: float
    frescura_horas: float
    score: float
