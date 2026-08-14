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

Códigos de error definidos: `VALIDACION`, `NO_ENCONTRADO`, `IA_TIMEOUT`, `IA_SIN_RESULTADO`, `INTERNO`.

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

## Pedidos (P1)

### `POST /api/pedidos`
```ts
// request
{ restauranteId, especie, cantidadKg }
// response
data: { pedidoId, estado: "cola" }
```

### `GET /api/pedidos/[pedidoId]/match`
```ts
data: {
  candidatos: Array<{ productoId, especie, pesoKg, precioActualKg, horasPublicado, score, motivo }>
}
```

Score = reglas explícitas (especie exacta, frescura, cantidad suficiente, cercanía de caleta).
Se presenta como sistema de recomendación basado en reglas + score, **no** como "IA mágica".
Ser preciso acá suma en el criterio de uso apropiado de IA.

---

## Trabajar en paralelo sin backend listo

`src/lib/mocks.ts` exporta fixtures que cumplen exactamente estos tipos.
Rubén construye pantallas contra los mocks; cuando Manuel termina un endpoint, se cambia
la fuente de datos y nada más. **No esperar.**
