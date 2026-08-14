# 04 · Modelo de datos

Prisma + Postgres. Se aplica con `npx prisma db push` (sin migraciones).
Fuente canónica: `prisma/schema.prisma`. Este doc explica el **por qué** de cada tabla.

## Tablas

| Tabla | Rol | Nota |
|---|---|---|
| `Pescador` | Dueño de la captura | Login es mock: se elige de una lista |
| `Especie` | Catálogo con precio base, talla mínima legal y unidad | El precio base ancla el precio dinámico |
| `Captura` | El hecho: qué se pescó, cuánto, cómo se registró | Guarda el **resultado crudo de la IA** en `iaRaw` para poder mostrarlo/auditarlo |
| `Formulario` | Trazabilidad autocompletada + estado de envío | `estadoEnvio` incluye `simulado` de forma explícita |
| `Producto` | La captura publicada en el marketplace | `precioInicial` + `publicadoEn` son suficientes para derivar el precio actual |
| `SenalMercado` | Insumo del RAG: clima, temporada, oferta | Marcada `simulada: true` cuando corresponde — honestidad en la UI |
| `Restaurante` | Comprador, con sello certificado | |
| `Pedido` | Demanda del restaurante + matching | |

## Reglas de datos importantes

1. **El precio actual NO se guarda como fuente de verdad.** Se **deriva** de
   `precioInicial` + horas transcurridas desde `publicadoEn` mediante `src/lib/pricing.ts`.
   Guardamos `precioActual` solo como caché para mostrar y para el historial del gráfico.
   Motivo: la demo debe mostrar precio bajando sin depender de un cron corriendo.

2. **`iaRaw` guarda el JSON completo del modelo.** Es la evidencia de que la IA hizo algo real,
   y sirve para mostrar confianza en pantalla (le da puntos al criterio del 40%).

3. **Toda señal simulada se marca.** `SenalMercado.simulada` se refleja en un badge en la UI.

4. **Timestamps con desplazamiento para la demo.** El seed crea productos publicados hace
   2, 8 y 20 horas, para que el marketplace muestre los tres estados de descuento
   **desde el primer segundo**, sin tener que esperar en vivo. Esto es clave para el pitch.

## Esquema (resumen)

```prisma
model Pescador {
  id, nombre, caleta, region, rpaMock, capturas[]
}

model Especie {
  id, nombre, nombreCientifico?, precioBaseKg, tallaMinimaCm?, unidad
}

model Captura {
  id, pescadorId, especieNombre, cantidad, pesoKg, largoCm?
  metodo: foto|voz|manual
  confianzaIa?, iaRaw Json?, fotoUrl?, transcripcion?
  estado: pendiente|validada|enviada
  creadaEn, formulario?, producto?
}

model Formulario {
  id, capturaId, camposFijos Json, camposVariables Json
  estadoEnvio: borrador|enviado_simulado, folioMock?, enviadoEn?
}

model Producto {
  id, capturaId, precioInicialKg, precioActualKg, publicadoEn
  ultimoAjuste?, descuentoPct, estado: disponible|reservado|vendido|merma
  tendencia?, justificacionIa?
}

model SenalMercado {
  id, tipo: clima|temporada_turistica|oferta_regional, titulo, contenido
  valor?, fecha, simulada, fuente?
}

model Restaurante { id, nombre, comuna, selloCertificado, pedidos[] }

model Pedido {
  id, restauranteId, especieNombre, cantidadKg
  estado: cola|match|resuelto, productoId?, scoreMatch?, creadoEn
}
```

## Seed (`prisma/seed.ts`)

Debe dejar la app **demostrable sin tocar nada**:

- 1 pescador: `Luis Ovalle · Caleta Portales · Valparaíso · RPA mock`
- 3 especies con precio base realista: congrio, jaiba, jibia
- 3 productos publicados hace **2 h, 8 h y 20 h** (para ver los 3 tramos de descuento)
- 4–6 señales de mercado (agosto en Valparaíso), marcadas como simuladas
- 2 restaurantes, 1 con sello certificado
- 1 pedido en cola, para poder demostrar el matching

Comando: `npm run seed` (idempotente: limpia y recarga).
