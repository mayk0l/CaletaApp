# 10 · Tareas para Trello

Cada tarjeta tiene **ID**, dueño, estimación y criterio de aceptación.
Los IDs sirven para hablar por voz sin ambigüedad: *"estoy trabado en la CA-07"*.

## Estructura del tablero

**Listas:** `Hecho` · `Ahora (bloque actual)` · `Siguiente` · `Backlog P1` · `Pitch (Joaquín/Pía)`

**Etiquetas:** 🟦 `Manuel` · 🟩 `Rubén` · 🟥 `Bloqueante` · 🟨 `P1`

Regla: **máximo 2 tarjetas en `Ahora` por persona.** Si hay más, no estamos priorizando.

## Carga total

| Persona | Tarjetas P0 | Estimado |
|---|---|---|
| Manuel | CA-01 a CA-10 | ~6 h de trabajo neto |
| Rubén | CA-20 a CA-29 | ~5,5 h de trabajo neto |
| Juntos | CA-40, CA-41 | ~1 h |

Quedan ~10 h con sueño incluido. **Los estimados no tienen holgura para debugging**, así que
P1 se corta sin discusión si nos atrasamos.

---

## Pegar en `Hecho` (ya está listo)

```
CA-00 Scaffolding Next.js + docs/ como fuente de verdad + contrato de tipos
```

Incluye: Next.js 16 + TS + Tailwind v4, paleta corporativa, `src/lib/types.ts`,
`src/lib/mocks.ts`, `src/lib/pricing.ts`, esquema Prisma, seed, stubs de rutas y endpoints,
landing y `/marketplace` renderizando los 3 tramos. Build y lint verdes. Pusheado a `main`.

---

## Pegar en `Ahora (bloque actual)`

```
CA-01 [M][BLOQ] Crear GEMINI_API_KEY y compartirla por canal privado — 10 min
CA-02 [M][BLOQ] Neon + DATABASE_URL + db push + seed — 25 min
CA-20 [R][BLOQ] Deploy vacío en Vercel con las 2 env vars — 20 min
CA-21 [R] CapturaTabs + SubidorFoto contra mocks — 60 min
```

## Pegar en `Siguiente`

```
CA-03 [M] client.ts + vision.ts + POST /api/capturas/imagen — 75 min
CA-04 [M] POST /api/capturas/voz con audio nativo de Gemini — 45 min
CA-05 [M] POST /api/capturas/manual — 15 min
CA-06 [M] GET /api/formulario/[id] con advertencias de talla — 40 min
CA-07 [M] POST /api/formulario/[id]/enviar + publicación automática — 35 min
CA-08 [M] GET /api/marketplace real con Prisma + pricing — 30 min
CA-09 [M] Base de conocimiento del RAG + embeddings precalculados — 30 min
CA-10 [M] POST /api/marketplace/[id]/precio con RAG acotado a ±15% — 60 min
CA-22 [R] GrabadorVoz con MediaRecorder — 45 min
CA-23 [R] ConfianzaIA + confirmación manual bajo el umbral 0.6 — 25 min
CA-24 [R] Formulario editable + advertencias + validar y enviar — 60 min
CA-25 [R] /marketplace consumiendo el endpoint real — 30 min
CA-26 [R] /pescador con historial de capturas — 30 min
CA-27 [R] Pulido responsive + estados vacíos + skeletons — 40 min
CA-28 [R] Fotos curadas de las 3 especies en public/demo — 20 min
CA-29 [R] Deploy a producción + prueba en móvil + QR — 20 min
CA-40 [R+M] Grabar video de respaldo del flujo completo — 45 min
CA-41 [R+M] Smoke test en producción de los 3 caminos de IA — 15 min
```

## Pegar en `Backlog P1` (solo si vamos adelantados)

```
CA-50 [R] /restaurante con filtro por especie y crear pedido — 45 min
CA-51 [M] POST /api/pedidos + GET /api/pedidos/[id]/match con score — 45 min
CA-52 [R] Sello Pesca Artesanal Certificada en perfil de restaurante — 15 min
CA-53 [R] Login mock como selector de pescador — 20 min
CA-54 [M] Reserva de producto por restaurante — 30 min
```

## Pegar en `Pitch (Joaquín/Pía)`

```
CA-60 Corregir cifra: 1.033 embarcaciones, no 1.200 (boletín 4T2025)
CA-61 Agregar dato EE.UU.: certificado de admisibilidad obligatorio desde 1-ene-2026
CA-62 Verificar o suavizar el 94%/6% industrial vs artesanal
CA-63 Verificar o reemplazar el dato de merluza común (13 años / −15%)
CA-64 Conseguir screenshot del formulario real de SERNAPESCA
CA-65 Alinear los nombres del cierre con el equipo real
CA-66 Conseguir 2-3 fotos reales de pescado para la demo de visión
CA-67 Ensayar 3 veces con cronómetro (bloque 09:00-10:00)
CA-68 Tener QR y URL del demo en el celular y en la lámina
```

---

# Detalle de las tarjetas

## Cadena crítica

El orden que importa. Todo lo demás se puede reordenar:

```
CA-01 ─┬─▶ CA-03 ──▶ CA-06 ──▶ CA-07 ──▶ CA-08 ──▶ CA-10 ──▶ CA-29 ──▶ CA-40
CA-02 ─┘                                    ▲
                                            │
CA-21 ──▶ CA-23 ──▶ CA-24 ──▶ CA-25 ────────┘
```

**Si CA-01 o CA-02 se atrasan, se atrasa todo.** Son lo primero de la noche.

---

## Tarjetas de Manuel

### CA-01 · Crear GEMINI_API_KEY 🟥
**10 min.** Bloquea los 3 usos de IA, o sea el 40% de la nota.
- https://aistudio.google.com/apikey — free tier alcanza
- Va a `.env.local` **y** a Vercel → Settings → Environment Variables
- ✅ Un script de prueba obtiene respuesta del modelo

### CA-02 · Neon + seed 🟥
**25 min.**
- https://neon.tech → proyecto nuevo → copiar connection string a `DATABASE_URL`
- `npm run db:push && npm run seed`
- ✅ `npm run db:studio` muestra 3 productos publicados hace 2 h, 8 h y 20 h

### CA-03 · Visión: POST /api/capturas/imagen
**75 min.** Depende de CA-01, CA-02. Prompt exacto en `docs/06-ia-y-prompts.md`.
- Implementar `src/lib/ai/vision.ts` usando `getAi()` y `conTimeout()` de `client.ts`
- `responseMimeType: "application/json"`, catálogo cerrado: congrio, jaiba, jibia
- Persistir `Captura` con `iaRaw` = respuesta cruda del modelo
- ✅ Una foto devuelve especie + confianza + peso en <10 s
- ✅ Una foto de algo que **no** es pescado devuelve `desconocida` con confianza baja
- ✅ Cortar el wifi a mitad de camino devuelve `{ok:false, error:{code:"IA_TIMEOUT"}}`, no un stacktrace

### CA-04 · Voz: POST /api/capturas/voz
**45 min.** Depende de CA-03 (reutiliza el patrón).
- Gemini procesa el audio directo: transcripción + entidades en **una** llamada
- Si dice peso total en vez de unitario, normalizar y anotarlo en `notas`
- ✅ "traje dos congrios de tres kilos cada uno" → `{especie:"congrio", cantidad:2, peso_unitario_kg:3}`

### CA-05 · Manual: POST /api/capturas/manual
**15 min.** El fallback cuando la IA falla o hay mala señal. No es un caso de error.
- ✅ Crea la captura con `metodo:"manual"`, `confianza:1`, y devuelve `capturaId`

### CA-06 · GET /api/formulario/[id]
**40 min.** Depende de CA-02.
- `camposFijos` del pescador, `camposVariables` de la captura
- `advertencias`: si `largoCm` < talla mínima legal de la especie, avisarlo
- ✅ El formulario llega lleno desde una captura real
- ✅ Un congrio de 45 cm genera la advertencia de talla (mínimo 60 cm)

> La advertencia de talla es trazabilidad con valor real, no solo autocompletado.
> Vale mencionarla en el pitch: el sistema no solo llena el papel, revisa que sea legal.

### CA-07 · POST /api/formulario/[id]/enviar
**35 min.** Depende de CA-06.
- Armar el payload real, esperar ~1,5 s (que se vea el estado de carga), devolver `folioMock`
- Marcar la captura como `enviada` **y crear el Producto** en la misma operación
- Devolver `simulado: true`
- ✅ Validar deja el producto visible en `/marketplace` sin pasos manuales

### CA-08 · GET /api/marketplace real
**30 min.** Depende de CA-02.
- Reemplazar los mocks por Prisma
- **Derivar** `precioActualKg`, `descuentoPct`, `horasHastaProximoTramo` con `calcularPrecioBase()`
- No confiar en el precio guardado en la BD (ver `docs/04-modelo-datos.md`)
- ✅ El JSON tiene la misma forma que antes → el frontend no cambia nada

### CA-09 · Base de conocimiento del RAG
**30 min.**
- Llegar a ~15-20 documentos en `src/data/knowledge/` (ya hay 8 de arranque)
- Embeddings con `text-embedding-004`, precalculados y guardados a JSON
- ✅ Un script imprime el top-3 para "congrio, 20 horas sin venderse, agosto en Valparaíso"

### CA-10 · POST /api/marketplace/[id]/precio
**60 min.** LA tarjeta del producto. Depende de CA-08, CA-09.
- Capa A: `calcularPrecioBase()` — siempre corre, no falla nunca
- Capa B: recuperar señales → LLM → `acotarAjusteIa()` a ±15%
- Si B falla o da timeout: devolver A con `degradado: true`
- ✅ Devuelve `{precio_sugerido, tendencia, justificacion, senales_usadas}`
- ✅ La justificación **nombra la señal concreta** que usó
- ✅ Con `GEMINI_API_KEY` vacía sigue devolviendo precio, con `degradado: true`

---

## Tarjetas de Rubén

### CA-20 · Deploy vacío en Vercel 🟥
**20 min.** Se hace **ahora**, no a las 5 AM. El deploy nunca debe ser la sorpresa final.
- `npx vercel` → link → `npx vercel --prod`
- Configurar `GEMINI_API_KEY` y `DATABASE_URL` en Vercel
- ✅ La URL pública carga la landing y `/marketplace` con los mocks

### CA-21 · CapturaTabs + SubidorFoto
**60 min.** No depende del backend: usar `mockCapturaFoto` de `src/lib/mocks.ts`.
- 3 pestañas: Foto · Voz · Manual
- Input con `capture="environment"` + preview de la imagen
- Botones grandes: se usa de pie y con las manos mojadas
- ✅ Se puede recorrer el flujo completo en el celular contra los mocks

### CA-22 · GrabadorVoz
**45 min.**
- `MediaRecorder` → webm → `POST /api/capturas/voz`
- Estado visible de grabación y permiso de micrófono denegado manejado
- ✅ Graba, envía y muestra la transcripción
- ✅ Sin permiso de micrófono ofrece foto o manual, no se queda pegado

### CA-23 · ConfianzaIA + umbral
**25 min.** Depende de CA-21.
- Mostrar el % de confianza del modelo
- Si `< UMBRAL_CONFIANZA` (0.6): pedir confirmación manual
- ✅ Con `mockCapturaDudosa` la UI lleva a confirmar, no da el dato por bueno

> Esto suma en el criterio de IA: un modelo honesto sobre su incertidumbre es mejor
> demo que uno que finge certeza.

### CA-24 · Formulario editable + enviar
**60 min.** Depende de CA-06 (o mocks).
- Campos editables: el pescador corrige lo que la IA estimó mal
- `advertencias` en cobre
- Validar → estado de carga → folio + `<BadgeSimulado />` → redirigir a `/marketplace`
- ✅ El flujo captura → formulario → marketplace se recorre sin tocar la URL a mano

### CA-25 · /marketplace con datos reales
**30 min.** Depende de CA-08.
- Cambiar `mockMarketplace` por `fetch("/api/marketplace")`
- No recalcular precios en el render (regla de pureza de React)
- ✅ Un producto publicado desde el flujo aparece en la grilla

### CA-26 · /pescador con historial
**30 min.**
- ✅ Las capturas registradas aparecen listadas con su estado

### CA-27 · Pulido
**40 min.** Después de las 04:00 solo esto y bugs.
- Responsive real en móvil, estados vacíos, foco visible, contraste
- ✅ Se ve bien en un teléfono de verdad, no en el simulador

### CA-28 · Fotos de demo
**20 min.**
- 2-3 fotos por especie en `public/demo/`, **probadas** contra CA-03
- ✅ Cada foto da el resultado esperado. Si alguna falla, se reemplaza

### CA-29 · Deploy final + QR
**20 min.**
- ✅ La URL de producción funciona en el celular de Joaquín con datos de demo cargados
- ✅ QR generado y probado

---

## Tarjetas conjuntas

### CA-40 · Video de respaldo
**45 min.** Seguro de vida del pitch.
- 60-90 s del flujo completo, sin audio (Joaquín narra en vivo)
- Guardado **local** en el notebook, no en la nube
- ✅ Se reproduce con el wifi apagado

### CA-41 · Smoke test en producción
**15 min.** A las 08:30, no antes de dormir.
- Los 3 caminos de IA probados **en la URL pública**, no en local
- ⚠️ No hacer pruebas masivas después de las 09:00: rate limit del free tier
- ✅ Checklist de `docs/11-riesgos-y-demo.md` completo

---

## Definición de "Hecho"

Una tarjeta pasa a `Hecho` solo si:

1. `npm run build` pasa
2. Está mergeada en `main`
3. **Se puede mostrar en pantalla.** Si no se ve, no cuenta
4. Si cambió un contrato de API, `docs/05-api-contratos.md` quedó actualizado en el mismo commit
