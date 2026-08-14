"""CaletaApp Backend — FastAPI
Ocean Lab Hackathon 2026 · LimacheWaves
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers import capturas, formulario, marketplace, pedidos

app = FastAPI(title="CaletaApp API", version="1.0.0")

# CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(capturas.router)
app.include_router(formulario.router)
app.include_router(marketplace.router)
app.include_router(pedidos.router)


@app.on_event("startup")
def startup():
    init_db()


@app.get("/api/health")
def health():
    return {"status": "ok", "team": "LimacheWaves", "product": "CaletaApp"}


@app.get("/api/pescadores")
def listar_pescadores():
    """Lista pescadores para el frontend."""
    from database import SessionLocal
    from models import Pescador
    db = SessionLocal()
    try:
        pescadores = db.query(Pescador).all()
        return [{"id": p.id, "nombre": p.nombre, "caleta": p.caleta, "region": p.region} for p in pescadores]
    finally:
        db.close()


@app.get("/api/restaurantes")
def listar_restaurantes():
    """Lista restaurantes para el frontend."""
    from database import SessionLocal
    from models import Restaurante
    db = SessionLocal()
    try:
        restaurantes = db.query(Restaurante).all()
        return [{"id": r.id, "nombre": r.nombre, "sello_certificado": bool(r.sello_certificado)} for r in restaurantes]
    finally:
        db.close()
