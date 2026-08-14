"""Router marketplace — precio dinámico + RAG + publicación."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import json

from database import get_db
from models import Captura, ProductoMarketplace
from schemas import ProductoOut, PrediccionOut
from rag import calcular_prediccion, actualizar_precio

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])


@router.post("/publicar/{captura_id}", response_model=ProductoOut)
def publicar(captura_id: int, db: Session = Depends(get_db)):
    """Publica una captura validada en el marketplace."""
    captura = db.query(Captura).filter(Captura.id == captura_id).first()
    if not captura:
        raise HTTPException(404, "Captura no encontrada")
    if captura.estado != "validada":
        raise HTTPException(400, "La captura debe estar validada primero")

    # Precio inicial según especie (CLP por kg)
    precios_base = {
        "congrio": 9000, "merluza": 6000, "jaiba": 4000,
        "reineta": 8000, "corvina": 7000, "desconocida": 5000,
    }
    precio_inicial = precios_base.get(captura.especie, 5000) * max(1, captura.peso_kg)

    ahora = datetime.now(timezone.utc).isoformat()
    producto = ProductoMarketplace(
        captura_id=captura_id,
        especie=captura.especie,
        cantidad=1,
        precio_inicial=round(precio_inicial, 2),
        precio_actual=round(precio_inicial, 2),
        timestamp_publicacion=ahora,
        ultima_actualizacion=ahora,
        estado="disponible",
    )
    db.add(producto)
    db.commit()
    db.refresh(producto)
    return _producto_to_out(producto)


@router.get("", response_model=list[ProductoOut])
def listar(db: Session = Depends(get_db)):
    """Lista todos los productos disponibles con precio_actual."""
    productos = db.query(ProductoMarketplace).filter(
        ProductoMarketplace.estado == "disponible"
    ).all()
    return [_producto_to_out(p) for p in productos]


@router.post("/{producto_id}/actualizar-precio", response_model=ProductoOut)
def actualizar(producto_id: int, db: Session = Depends(get_db)):
    """Recalcula precio_actual según tiempo sin venta + señales RAG."""
    producto = db.query(ProductoMarketplace).filter(ProductoMarketplace.id == producto_id).first()
    if not producto:
        raise HTTPException(404, "Producto no encontrado")
    actualizar_precio(db, producto)
    db.refresh(producto)
    return _producto_to_out(producto)


@router.get("/{producto_id}/prediccion", response_model=PrediccionOut)
def prediccion(producto_id: int, db: Session = Depends(get_db)):
    """Devuelve tendencia sugerida + justificación explicada."""
    producto = db.query(ProductoMarketplace).filter(ProductoMarketplace.id == producto_id).first()
    if not producto:
        raise HTTPException(404, "Producto no encontrado")
    result = calcular_prediccion(db, producto)
    return PrediccionOut(**result)


@router.post("/actualizar-precios")
def actualizar_todos(db: Session = Depends(get_db)):
    """Cron endpoint: actualiza precios de todos los productos disponibles."""
    productos = db.query(ProductoMarketplace).filter(
        ProductoMarketplace.estado == "disponible"
    ).all()
    actualizados = []
    for p in productos:
        nuevo = actualizar_precio(db, p)
        actualizados.append({"id": p.id, "precio_anterior": p.precio_actual, "precio_nuevo": nuevo})
    return {"actualizados": actualizados, "total": len(actualizados)}


def _producto_to_out(p: ProductoMarketplace) -> ProductoOut:
    return ProductoOut(
        id=p.id, captura_id=p.captura_id, especie=p.especie, cantidad=p.cantidad,
        precio_inicial=p.precio_inicial, precio_actual=p.precio_actual,
        timestamp_publicacion=p.timestamp_publicacion,
        ultima_actualizacion=p.ultima_actualizacion, estado=p.estado,
    )
