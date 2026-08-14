"""Router formulario SERNAPESCA — autollenado + validación + envío mock."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import json

from database import get_db
from models import Captura, FormularioTrazabilidad, Pescador, ProductoMarketplace
from schemas import FormularioOut

router = APIRouter(prefix="/api/formulario", tags=["formulario"])

# Campos del formulario real de SERNAPESCA (replica del screenshot)
CAMPOS_ESTATICOS = {
    "region": "Valparaíso",
    "zona_pesca": "Caleta Portales",
    "tipo_flota": "Artesanal",
    "arte_pesca": "Espinel",
    "unidad_medida": "kilogramos",
}


@router.get("/{captura_id}", response_model=FormularioOut)
def obtener_formulario(captura_id: int, db: Session = Depends(get_db)):
    """Arma el JSON del formulario autocompletado con datos de la captura."""
    captura = db.query(Captura).filter(Captura.id == captura_id).first()
    if not captura:
        raise HTTPException(404, "Captura no encontrada")

    pescador = db.query(Pescador).filter(Pescador.id == captura.pescador_id).first()

    campos_variables = {
        "pescador_nombre": pescador.nombre if pescador else "",
        "pescador_registro": pescador.registro_sernapesca if pescador else "",
        "especie": captura.especie,
        "peso_kg": captura.peso_kg,
        "largo_cm": captura.largo_cm,
        "fecha_captura": captura.timestamp,
        "metodo_registro": captura.metodo_registro,
    }

    # Buscar formulario existente o crear uno nuevo
    form = db.query(FormularioTrazabilidad).filter(
        FormularioTrazabilidad.captura_id == captura_id
    ).first()

    campos_completos = {**CAMPOS_ESTATICOS, **campos_variables}

    if form:
        form.campos_json = json.dumps(campos_completos, ensure_ascii=False)
    else:
        form = FormularioTrazabilidad(
            captura_id=captura_id,
            campos_json=json.dumps(campos_completos, ensure_ascii=False),
            estado_envio="pendiente",
        )
        db.add(form)

    db.commit()
    db.refresh(form)

    return FormularioOut(
        id=form.id, captura_id=form.captura_id,
        campos=campos_completos, estado_envio=form.estado_envio,
    )


@router.post("/{captura_id}/validar", response_model=FormularioOut)
def validar(captura_id: int, db: Session = Depends(get_db)):
    """Pescador confirma el formulario — marca captura como validada."""
    captura = db.query(Captura).filter(Captura.id == captura_id).first()
    if not captura:
        raise HTTPException(404, "Captura no encontrada")

    captura.estado = "validada"
    form = db.query(FormularioTrazabilidad).filter(
        FormularioTrazabilidad.captura_id == captura_id
    ).first()
    if form:
        form.estado_envio = "validado"
    db.commit()

    return obtener_formulario(captura_id, db)


@router.post("/{captura_id}/enviar", response_model=FormularioOut)
def enviar(captura_id: int, db: Session = Depends(get_db)):
    """Simula envío a SERNAPESCA — devuelve confirmación mock."""
    captura = db.query(Captura).filter(Captura.id == captura_id).first()
    if not captura:
        raise HTTPException(404, "Captura no encontrada")
    if captura.estado != "validada":
        raise HTTPException(400, "Debe validar antes de enviar")

    # Mock: simular envío
    captura.estado = "enviada"
    form = db.query(FormularioTrazabilidad).filter(
        FormularioTrazabilidad.captura_id == captura_id
    ).first()
    if form:
        form.estado_envio = "enviado_mock"

    # Auto-publicar en marketplace
    producto_existente = db.query(ProductoMarketplace).filter(
        ProductoMarketplace.captura_id == captura_id
    ).first()
    if not producto_existente:
        _publicar_automatico(db, captura)

    db.commit()
    return obtener_formulario(captura_id, db)


def _publicar_automatico(db: Session, captura: Captura):
    """Publica la captura en marketplace automáticamente tras envío."""
    precios_base = {
        "congrio": 9000, "merluza": 6000, "jaiba": 4000,
        "reineta": 8000, "corvina": 7000, "desconocida": 5000,
    }
    precio_inicial = precios_base.get(captura.especie, 5000) * max(1, captura.peso_kg)
    ahora = datetime.now(timezone.utc).isoformat()

    producto = ProductoMarketplace(
        captura_id=captura.id,
        especie=captura.especie,
        cantidad=1,
        precio_inicial=round(precio_inicial, 2),
        precio_actual=round(precio_inicial, 2),
        timestamp_publicacion=ahora,
        ultima_actualizacion=ahora,
        estado="disponible",
    )
    db.add(producto)
