"""Seed data — datos de demo realistas para Caleta Portales, Valparaíso."""
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from database import SessionLocal
from models import (
    Pescador, Captura, ProductoMarketplace,
    SenalMercado, Restaurante, Pedido, Base,
)
from database import engine


def run_seed():
    """Poblar DB con datos de demo si está vacía."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Pescador).count() > 0:
            return  # ya tiene datos

        ahora = datetime.now(timezone.utc).isoformat()

        # Pescadores
        p1 = Pescador(nombre="Don Pedro", caleta="Caleta Portales", region="Valparaíso", registro_sernapesca="PA-00123")
        p2 = Pescador(nombre="Margarita", caleta="Caleta Portales", region="Valparaíso", registro_sernapesca="PA-00456")
        p3 = Pescador(nombre="El Turco", caleta="Caleta San Pedro", region="Valparaíso", registro_sernapesca="PA-00789")
        db.add_all([p1, p2, p3])
        db.flush()

        # Capturas
        c1 = Captura(pescador_id=p1.id, especie="congrio", peso_kg=8.5, largo_cm=65, metodo_registro="voz", timestamp=ahora, estado="validada")
        c2 = Captura(pescador_id=p2.id, especie="merluza", peso_kg=12.0, largo_cm=40, metodo_registro="manual", timestamp=ahora, estado="validada")
        c3 = Captura(pescador_id=p3.id, especie="jaiba", peso_kg=3.0, largo_cm=15, metodo_registro="voz", timestamp=ahora, estado="validada")
        c4 = Captura(pescador_id=p1.id, especie="reineta", peso_kg=5.5, largo_cm=50, metodo_registro="manual", timestamp=ahora, estado="pendiente")
        db.add_all([c1, c2, c3, c4])
        db.flush()

        # Productos en marketplace
        prod1 = ProductoMarketplace(captura_id=c1.id, especie="congrio", cantidad=2, precio_inicial=18000, precio_actual=18000, timestamp_publicacion=ahora, ultima_actualizacion=ahora, estado="disponible")
        prod2 = ProductoMarketplace(captura_id=c2.id, especie="merluza", cantidad=3, precio_inicial=12000, precio_actual=12000, timestamp_publicacion=ahora, ultima_actualizacion=ahora, estado="disponible")
        prod3 = ProductoMarketplace(captura_id=c3.id, especie="jaiba", cantidad=6, precio_inicial=8000, precio_actual=8000, timestamp_publicacion=ahora, ultima_actualizacion=ahora, estado="disponible")
        db.add_all([prod1, prod2, prod3])
        db.flush()

        # Restaurantes
        r1 = Restaurante(nombre="Restaurante El Pescador", sello_certificado=1)
        r2 = Restaurante(nombre="Hotel Mirador Valparaíso", sello_certificado=1)
        r3 = Restaurante(nombre="Caleta Bistró", sello_certificado=1)
        db.add_all([r1, r2, r3])
        db.flush()

        # Señales de mercado simuladas (agosto 2026, Valparaíso)
        senales = [
            SenalMercado(tipo="clima", valor="Despejado, 14°C, viento sur 15kt", fecha=ahora, fuente="SIMULADA"),
            SenalMercado(tipo="temporada_turistica", valor="Alta temporada fin de semana, feriado nacional próximo", fecha=ahora, fuente="SIMULADA"),
            SenalMercado(tipo="disponibilidad_regional", valor="Baja disponibilidad de congrio esta semana, 3 pescadores activos", fecha=ahora, fuente="SIMULADA"),
            SenalMercado(tipo="clima", valor="Mar tranquilo, apto para faena", fecha=ahora, fuente="SIMULADA"),
        ]
        db.add_all(senales)

        # Pedido de ejemplo
        ped1 = Pedido(restaurante_id=r1.id, especie_solicitada="congrio", cantidad=2, estado="cola")
        db.add(ped1)

        db.commit()
    finally:
        db.close()
