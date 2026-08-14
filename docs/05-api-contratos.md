# 05 · Contratos de API

**Este documento es el acuerdo entre Rubén (frontend) y Manuel (backend).**
Los tipos viven en `src/lib/types.ts` y son la versión ejecutable de este doc.
Cambiar un contrato = avisar + actualizar tipos + actualizar este doc, en el mismo commit.

## Envoltura de respuesta

Toda respuesta usa la misma forma. Nada de devolver el objeto pelado.

```ts
// éxito
{ "ok": true, "data": { ... } }

// error
{ "ok": false, "error": { "code": "IA_TIMEOUT", "message": "texto para mostrar al usuario" } }
```

Códigos de error definidos: `VALIDACION`, `NO_ENCONTRADO`, `IA_TIMEOUT`, `IA_CUOTA`,
`IA_SOBRECARGA`, `IA_SIN_RESULTADO`, `INTERNO`.

Los tres códigos de IA distinguen fallas que se arreglan distinto, porque durante las
pruebas contra la API real aparecieron las tres y todas se veían iguales en pantalla:

| Código | HTTP | Qué pasó | Qué hacer |
|---|---|---|---|
| `IA_TIMEOUT` | 504 | Ningún modelo de la cadena respondió dentro de `TIMEOUT_MULTIMODAL_MS` (15s por intento) | Reintentar o cargar manual |
| `IA_CUOTA` | 429 | Cuota agotada. El tier gratuito de Gemini limita **por modelo y por día** (se midió un tope de 20 req/día en `gemini-2.5-flash`) | Esperar, o `GEMINI_MODEL` con otro modelo: el cupo es por modelo |
| `IA_SOBRECARGA` | 503 | El modelo devolvió "currently experiencing high traffic". No es culpa del input ni de la key | Reintentar; la cadena de modelos ya lo intenta sola |
| `IA_SIN_RESULTADO` | 502 | La IA respondió pero sin JSON usable | Cargar manual |

Antes existía solo `IA_SIN_RESULTADO` para todo lo que no fuera timeout, así que una
cuota agotada se mostraba como "no se pudo reconocer la captura" y mandaba a revisar
la foto cuando el problema no tenía nada que ver con la foto.

**Regla de oro para la demo:** ningún endpoint de IA revienta la pantalla. Si la IA falla,
se responde `ok:false` con código, y el frontend ofrece **el formulario manual** como salida.
Un pescador con mala señal es un caso de uso real, no un error — se presenta como tal.

---

## Capturas

### `POST /api/capturas/imagen`
`multipart/form-data`: `foto` (File), `pescadorId` (string)

```ts
data: {
  capturaId: string
  reconocimiento: {
    especie: string
    confianza: number        // 0..1
    pesoKgEstimado: number
    largoCmEstimado?: number
    cantidad: number
    notas?: string           // lo que el modelo usó como referencia de tamaño
    fuente: "vision"
  }
}
```

### `POST /api/capturas/voz`
`multipart/form-data`: `audio` (File, webm/ogg), `pescadorId`

```ts
data: {
  capturaId: string
  transcripcion: string
  reconocimiento: { ...igual que arriba, fuente: "voz" }
}
```

### `POST /api/capturas/manual`
`application/json`

```ts
// request
{ pescadorId, especie, cantidad, pesoKg, largoCm? }
// response
data: { capturaId, reconocimiento: { ..., confianza: 1, fuente: "manual" } }
```

---

## Formulario de trazabilidad

### `GET /api/formulario/[capturaId]`
Arma (o recupera) el formulario autocompletado.

```ts
data: {
  formularioId: string
  camposFijos:    { pescador, rpa, caleta, region, embarcacion, fecha }
  camposVariables:{ especie, cantidad, pesoKg, largoCm, aparejo, zonaCaptura, horaDesembarque }
  estadoEnvio: "borrador" | "enviado_simulado"
  advertencias: string[]   // ej: "talla bajo el mínimo legal (37 cm)"
}
```

`advertencias` es un detalle que suma: si la talla estimada está bajo el mínimo legal de la
especie, el formulario lo avisa. Eso es trazabilidad con valor real, no solo autocompletado.

### `POST /api/formulario/[capturaId]/enviar`
Simula el envío y **publica automáticamente** en el marketplace.

```ts
data: {
  folioMock: string          // ej: "SP-2026-000148"
  enviadoEn: string          // ISO
  simulado: true             // el frontend DEBE mostrar este badge
  productoId: string         // publicación automática
}
```

---

## Marketplace y precio

### `GET /api/marketplace`
```ts
data: {
  productos: Array<{
    id, especie, cantidad, pesoKg
    precioInicialKg, precioActualKg, descuentoPct
    horasPublicado: number
    estado: "disponible" | "reservado" | "vendido" | "merma"
    tendencia?: "alcista" | "bajista" | "estable"
    justificacionIa?: string
    etiquetaTramo?: string              // "Fresco" | "Primer ajuste" | ...
    horasHastaProximoTramo?: number | null   // para el contador de la UI
    proximoDescuentoPct?: number | null
    pescador: { nombre, caleta }
    selloCertificado: boolean
  }>
}
```

⚠️ `horasHastaProximoTramo` y `proximoDescuentoPct` **los calcula el backend** con
`calcularPrecioBase()`. El frontend no puede recalcularlos: llamar `Date.now()` durante el
render viola la regla de pureza de React y el lint lo bloquea.

### `POST /api/marketplace/[productoId]/precio`
Recalcula el precio: regla determinista **+** ajuste RAG.

```ts
data: {
  precioAnteriorKg: number
  precioActualKg: number
  descuentoPct: number
  tendencia: "alcista" | "bajista" | "estable"
  justificacion: string      // una frase, en español, mostrable en pantalla
  senalesUsadas: string[]    // títulos de las señales que el RAG recuperó
  degradado: boolean         // true si la IA falló y se usó solo la regla base
}
```

`degradado: true` no es un error: es el fallback funcionando. La UI lo muestra
como "precio ajustado por regla base".

### `GET /api/marketplace/[productoId]/prediccion`
Igual que arriba pero **sin escribir** en la BD. Para mostrar la explicación sin mover precios.

---

## Pedidos y sugerencias (P1 — implementado por Rubén)

### `POST /api/pedidos`
```ts
// request
{ restauranteId, especie, cantidadKg }
// response 201
data: { pedidoId, estado: "cola" }
```

Valida especie contra el catálogo, cantidad > 0 y ≤ 500 kg, y que el restaurante exista.
Errores: `VALIDACION` (400) y `NO_ENCONTRADO` (404), con la envoltura de siempre.

### `GET /api/pedidos?restauranteId=`
Extensión del contrato: la cola completa con sus sugerencias, para pintar
`/restaurante` en una sola llamada en vez de N+1.

```ts
data: {
  pedidos: Array<{
    pedidoId, restaurante, especie, cantidadKg
    estado: "cola" | "match" | "resuelto"
    candidatos: CandidatoMatch[]
    productoElegidoId: string | null
    scoreElegido: number | null
  }>
}
```

### `GET /api/pedidos/[pedidoId]/match`
```ts
data: {
  candidatos: Array<{
    productoId, especie, pesoKg, precioActualKg, horasPublicado, score, motivo
    factores: Array<{ id, etiqueta, puntos, maximo, detalle }>   // desglose para la UI
  }>
}
```

Score = reglas explícitas en `src/lib/matching.ts`: filtro duro por especie, disponibilidad
y cantidad suficiente; luego 100 puntos repartidos en frescura 30, precio 25, calce de
cantidad 20, cercanía 15 y bonus anti-merma 10. A igual score, primero quien pidió antes.
Se presenta como sistema de recomendación basado en reglas + score, **no** como "IA mágica".
Ser preciso acá suma en el criterio de uso apropiado de IA.

`factores` es un agregado sobre `CandidatoMatch`: todos los campos del tipo original siguen
presentes, así que no rompe a nadie que consuma solo el contrato base.

**Son sugerencias, no reservas.** Tomar una sugerencia marca el `Pedido` como `resuelto` con
su `productoId` y `scoreMatch`, y **no toca `Producto.estado`**: el mismo producto puede
sugerirse a varios pedidos y el marketplace no cambia. Así el matching no interfiere con la
demo de precio dinámico.

⚠️ `src/lib/pedidos.ts` deriva `ProductoPublico` con la misma lógica que
`GET /api/marketplace` (precio desde `publicadoEn`, ajuste del RAG solo si tiene menos de
1 h). Está duplicado a propósito para que el matching no dependa del route handler de
Manuel: **si cambia el criterio de precio allá, hay que cambiarlo acá también.**

Falta un campo para la compra programada a futuro (`requeridoPara`): hoy el pedido se
encola sin fecha objetivo. Requiere 1 campo opcional aditivo en `prisma/schema.prisma`,
que es zona de Manuel.

---

## Trabajar en paralelo sin backend listo

`src/lib/mocks.ts` exporta fixtures que cumplen exactamente estos tipos.
Rubén construye pantallas contra los mocks; cuando Manuel termina un endpoint, se cambia
la fuente de datos y nada más. **No esperar.**
