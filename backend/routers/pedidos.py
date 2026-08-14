"""Router pedidos — matching restaurantes/hoteles ↔ pescadores."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from database import get_db
from models import Pedido, ProductoMarketplace, Restaurante, Captura
from schemas import PedidoIn, PedidoOut, MatchOut

router = APIRouter(prefix="/api/pedidos", tags=["pedidos"])


@router.post("", response_model=PedidoOut)
def crear_pedido(inp: PedidoIn, db: Session = Depends(get_db)):
    """Restaurante crea un pedido de especie."""
    pedido = Pedido(
        restaurante_id=inp.restaurante_id,
        especie_solicitada=inp.especie_solicitada,
        cantidad=inp.cantidad,
        estado="cola",
    )
    db.add(pedido)
    db.commit()
    db.refresh(pedido)
    return _pedido_to_out(pedido)


@router.get("/match/{pedido_id}", response_model=list[MatchOut])
def match_pedido(pedido_id: int, db: Session = Depends(get_db)):
    """Matching: filtra productos por especie, ordena por frescura + score."""
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(404, "Pedido no encontrado")

    # Productos disponibles de la especie solicitada
    productos = db.query(ProductoMarketplace).filter(
        ProductoMarketplace.estado == "disponible",
        ProductoMarketplace.especie == pedido.especie_solicitada,
    ).all()

    ahora = datetime.now(timezone.utc)
    matches = []
    for p in productos:
        # Frescura: horas desde publicación
        try:
            dt = datetime.fromisoformat(p.timestamp_publicacion.replace("Z", "+00:00"))
            frescura_h = max(0.0, (ahora - dt).total_seconds() / 3600)
        except Exception:
            frescura_h = 0.0

        # Score: más fresco + más barato = mejor match
        score_precio = 1.0 - (p.precio_actual / p.precio_inicial) if p.precio_inicial > 0 else 0
        score_frescura = 1.0 / (1.0 + frescura_h)
        score = round(score_frescura * 0.7 + score_precio * 0.3, 3)

        matches.append(MatchOut(
            producto_id=p.id, especie=p.especie, cantidad=p.cantidad,
            precio_actual=p.precio_actual, frescura_horas=round(frescura_h, 1),
            score=score,
        ))

    # Ordenar por score descendente
    matches.sort(key=lambda m: m.score, reverse=True)

    # Marcar pedido como matcheado si hay resultados
    if matches:
        pedido.estado = "match"
        db.commit()

    return matches


@router.get("", response_model=list[PedidoOut])
def listar_pedidos(db: Session = Depends(get_db)):
    """Lista todos los pedidos."""
    pedidos = db.query(Pedido).all()
    return [_pedido_to_out(p) for p in pedidos]


def _pedido_to_out(p: Pedido) -> PedidoOut:
    return PedidoOut(
        id=p.id, restaurante_id=p.restaurante_id,
        especie_solicitada=p.especie_solicitada, cantidad=p.cantidad, estado=p.estado,
    )
