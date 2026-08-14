"""Router capturas — registro por voz, manual e imagen."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from database import get_db
from models import Captura
from schemas import CapturaVozIn, CapturaManualIn, CapturaImagenIn, CapturaOut
from ia_service import reconocer_especie_imagen, extraer_entidades_voz

router = APIRouter(prefix="/api/capturas", tags=["capturas"])


@router.post("/voz", response_model=CapturaOut)
def captura_voz(inp: CapturaVozIn, db: Session = Depends(get_db)):
    """Recibe texto de voz, extrae entidades con IA y crea captura."""
    entidades = extraer_entidades_voz(inp.audio_text)
    ahora = datetime.now(timezone.utc).isoformat()

    captura = Captura(
        pescador_id=1,  # mock: pescador por defecto
        especie=entidades.get("especie", "desconocida"),
        peso_kg=entidades.get("peso_unitario_kg", 0) * entidades.get("cantidad", 1),
        largo_cm=None,
        metodo_registro="voz",
        timestamp=ahora,
        estado="pendiente",
    )
    db.add(captura)
    db.commit()
    db.refresh(captura)
    return _captura_to_out(captura)


@router.post("/manual", response_model=CapturaOut)
def captura_manual(inp: CapturaManualIn, db: Session = Depends(get_db)):
    """Registro manual — fallback sin IA."""
    ahora = datetime.now(timezone.utc).isoformat()
    captura = Captura(
        pescador_id=inp.pescador_id,
        especie=inp.especie,
        peso_kg=inp.peso_kg,
        largo_cm=inp.largo_cm,
        metodo_registro="manual",
        timestamp=ahora,
        estado="pendiente",
    )
    db.add(captura)
    db.commit()
    db.refresh(captura)
    return _captura_to_out(captura)


@router.post("/imagen", response_model=CapturaOut)
def captura_imagen(inp: CapturaImagenIn, db: Session = Depends(get_db)):
    """Reconoce especie + peso desde foto con Gemini visión."""
    resultado = reconocer_especie_imagen(inp.foto_base64)
    if not resultado:
        raise HTTPException(503, "API de visión no disponible")

    ahora = datetime.now(timezone.utc).isoformat()
    captura = Captura(
        pescador_id=inp.pescador_id,
        especie=resultado.get("especie", "desconocida"),
        peso_kg=resultado.get("peso_kg_estimado", 0),
        largo_cm=resultado.get("largo_cm_estimado"),
        metodo_registro="foto",
        timestamp=ahora,
        estado="pendiente",
    )
    db.add(captura)
    db.commit()
    db.refresh(captura)
    return _captura_to_out(captura)


def _captura_to_out(c: Captura) -> CapturaOut:
    return CapturaOut(
        id=c.id, pescador_id=c.pescador_id, especie=c.especie,
        peso_kg=c.peso_kg, largo_cm=c.largo_cm, metodo_registro=c.metodo_registro,
        estado=c.estado, timestamp=c.timestamp,
    )
