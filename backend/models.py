"""SQLAlchemy models — CaletaApp."""
from sqlalchemy import Column, Integer, Text, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Pescador(Base):
    __tablename__ = "pescador"
    id = Column(Integer, primary_key=True)
    nombre = Column(Text)
    caleta = Column(Text)
    region = Column(Text)
    registro_sernapesca = Column(Text)
    capturas = relationship("Captura", back_populates="pescador")


class Captura(Base):
    __tablename__ = "captura"
    id = Column(Integer, primary_key=True)
    pescador_id = Column(Integer, ForeignKey("pescador.id"))
    especie = Column(Text)
    peso_kg = Column(Float)
    largo_cm = Column(Float)
    metodo_registro = Column(Text)  # 'foto'|'voz'|'manual'
    foto_url = Column(Text)
    timestamp = Column(Text)
    estado = Column(Text, default="pendiente")  # 'pendiente'|'validada'|'enviada'
    pescador = relationship("Pescador", back_populates="capturas")


class FormularioTrazabilidad(Base):
    __tablename__ = "formulario_trazabilidad"
    id = Column(Integer, primary_key=True)
    captura_id = Column(Integer, ForeignKey("captura.id"))
    campos_json = Column(Text)  # JSON string
    estado_envio = Column(Text, default="pendiente")


class ProductoMarketplace(Base):
    __tablename__ = "producto_marketplace"
    id = Column(Integer, primary_key=True)
    captura_id = Column(Integer, ForeignKey("captura.id"))
    especie = Column(Text)
    cantidad = Column(Integer, default=1)
    precio_inicial = Column(Float)
    precio_actual = Column(Float)
    timestamp_publicacion = Column(Text)
    ultima_actualizacion = Column(Text)
    estado = Column(Text, default="disponible")  # 'disponible'|'reservado'|'vendido'


class SenalMercado(Base):
    __tablename__ = "senal_mercado"
    id = Column(Integer, primary_key=True)
    tipo = Column(Text)  # 'clima'|'temporada_turistica'|'disponibilidad_regional'
    valor = Column(Text)
    fecha = Column(Text)
    fuente = Column(Text)


class Restaurante(Base):
    __tablename__ = "restaurante"
    id = Column(Integer, primary_key=True)
    nombre = Column(Text)
    sello_certificado = Column(Integer, default=1)
    pedidos = relationship("Pedido", back_populates="restaurante")


class Pedido(Base):
    __tablename__ = "pedido"
    id = Column(Integer, primary_key=True)
    restaurante_id = Column(Integer, ForeignKey("restaurante.id"))
    especie_solicitada = Column(Text)
    cantidad = Column(Integer)
    estado = Column(Text, default="cola")  # 'cola'|'match'|'resuelto'
    restaurante = relationship("Restaurante", back_populates="pedidos")
