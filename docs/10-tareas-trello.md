# 10 · Tareas para Trello

## Cómo cargarlo rápido

Trello crea **una tarjeta por línea** si pegas varias líneas en "Añadir tarjeta".
Así que: crea las listas, pega el bloque correspondiente, y listo. Después abres las
tarjetas que te toquen y les pegas el detalle de la sección siguiente.

**Listas a crear:** `Backlog P0` · `Backlog P1` · `Haciendo` · `Revisar` · `Hecho` · `Pitch (Joaquín/Pía)`

**Etiquetas:** 🟦 `Manuel` · 🟩 `Rubén` · 🟧 `P0` · ⬜ `P1` · 🟥 `Bloqueante`

---

## Bloque 1 — pegar en `Backlog P0`

```
[SETUP][M][BLOQ] Crear GEMINI_API_KEY y compartirla por canal privado
[SETUP][M][BLOQ] Crear DB en Neon y compartir DATABASE_URL
[SETUP][M] prisma db push + seed con datos de Caleta Portales
[SETUP][R][BLOQ] Deploy vacío en Vercel + configurar env vars
[SETUP][R] Tokens de marca, AppHeader y landing con 3 accesos
[IA][M] POST /api/capturas/imagen — visión Gemini, especie + peso
[IA][M] POST /api/capturas/voz — audio Gemini, transcripción + entidades
[IA][M] POST /api/capturas/manual — fallback sin IA
[IA][M] pricing.ts — regla determinista de descuento por horas
[IA][M] Base de conocimiento del RAG en src/data/knowledge
[IA][M] RAG de precio — recuperación por coseno + LLM con límite ±15%
[API][M] GET /api/formulario/[capturaId] — autollenado + advertencias de talla
[API][M] POST /api/formulario/[capturaId]/enviar — folio mock + publicación automática
[API][M] GET /api/marketplace + POST /api/marketplace/[id]/precio
[UI][R] /pescador/captura con pestañas Foto | Voz | Manual
[UI][R] SubidorFoto con captura de cámara y preview
[UI][R] GrabadorVoz con MediaRecorder
[UI][R] ConfianzaIA + pedir confirmación manual si confianza < 0.6
[UI][R] /pescador/formulario/[id] autocompletado + BadgeSimulado
[UI][R] Validar y enviar — estado de carga + confirmación con folio
[UI][R] /marketplace con TarjetaProducto y PrecioDinamico
[UI][R] Contador "baja a −25% en 3 h 40 min" en cada producto
[DEMO][R] Fotos curadas de las 3 especies en public/demo
[DEMO][M] Seed con productos publicados hace 2, 8 y 20 horas
[DEMO][R] Deploy a producción + probar en móvil real + generar QR
[DEMO][R+M] Grabar video de respaldo del flujo completo
```

## Bloque 2 — pegar en `Backlog P1`

```
[UI][R] /restaurante con filtro por especie y crear pedido
[API][M] POST /api/pedidos + GET /api/pedidos/[id]/match con score
[UI][R] Sello Pesca Artesanal Certificada en producto y restaurante
[UI][R] Login mock — selector de pescador
[UI][R] /pescador home con historial de capturas
[UI][R] Estados vacíos y skeletons
[API][M] Endpoint de reserva de producto por restaurante
```

## Bloque 3 — pegar en `Pitch (Joaquín/Pía)`

```
[PITCH] Corregir cifra: 1.033 embarcaciones, no 1.200 (fuente boletín 4T2025)
[PITCH] Agregar dato EE.UU.: certificado de admisibilidad obligatorio desde 1-ene-2026
[PITCH] Verificar o suavizar el 94%/6% industrial vs artesanal
[PITCH] Verificar o reemplazar el dato de merluza común (13 años / −15%)
[PITCH] Conseguir screenshot del formulario real de SERNAPESCA
[PITCH] Alinear nombres del cierre con el equipo real
[PITCH] Conseguir 2-3 fotos reales de pescado para la demo de visión
[PITCH] Ensayar 3 veces con cronómetro (bloque 09:00-10:00)
[PITCH] Tener QR y URL del demo listos en el celular y en la lámina
```

---

## Detalle de las tarjetas críticas

Copia esto en la descripción de la tarjeta. Cada una trae **criterio de aceptación**:
si no se puede mostrar en pantalla, no está lista.

### `[SETUP][M][BLOQ] Crear GEMINI_API_KEY`
Bloquea los 3 usos de IA, o sea el 40% de la nota. Es lo primero de la noche.
- https://aistudio.google.com/apikey — free tier alcanza
- Va a `.env.local` **y** a Vercel → Settings → Environment Variables
- ✅ **Listo cuando:** un `curl` o un script de prueba devuelve respuesta del modelo

### `[SETUP][M][BLOQ] Crear DB en Neon`
- https://neon.tech → proyecto nuevo, región más cercana → copiar connection string
- ✅ **Listo cuando:** `npx prisma db push` corre sin error

### `[SETUP][R][BLOQ] Deploy vacío en Vercel`
Se hace **al principio**, no al final. El deploy nunca debe ser la sorpresa de las 5 AM.
- `npx vercel` → link → `npx vercel --prod`
- ✅ **Listo cuando:** la URL pública carga la landing y las env vars están configuradas

### `[IA][M] POST /api/capturas/imagen`
Prompt exacto en `docs/06-ia-y-prompts.md`.
- Guardar la respuesta cruda en `Captura.iaRaw`
- Timeout 12 s → `ok:false` con `IA_TIMEOUT`, nunca colgar la pantalla
- Catálogo cerrado: congrio, jaiba, jibia
- ✅ **Listo cuando:** subir una foto devuelve especie + confianza + peso en menos de 10 s, y una foto de algo que no es pescado devuelve `desconocida` con confianza baja

### `[IA][M] POST /api/capturas/voz`
- Gemini procesa el audio directo: no montar un STT aparte
- ✅ **Listo cuando:** "traje dos congrios de tres kilos cada uno" → `{especie: congrio, cantidad: 2, peso_unitario_kg: 3}`

### `[IA][M] pricing.ts`
Función **pura**, sin llamadas a red. Es el fallback que sostiene la demo si la IA se cae.
- Tramos: 0-6 h → 0% · 6-12 h → 10% · 12-24 h → 25% · 24-36 h → 40% · >36 h → riesgo de merma
- Exportar también `horasHastaProximoTramo()` para el contador de la UI
- ✅ **Listo cuando:** un producto de 8 h muestra −10% y uno de 20 h muestra −25%, sin internet

### `[IA][M] RAG de precio`
- ~15-20 documentos en `src/data/knowledge/`, embeddings precalculados a JSON
- Similitud coseno en memoria, top-3
- Ajuste acotado a **±15%** sobre el precio de la regla base
- ✅ **Listo cuando:** devuelve `{precio_sugerido, tendencia, justificacion, senales_usadas}` y la justificación **nombra la señal concreta** que usó

### `[API][M] POST /api/formulario/[capturaId]/enviar`
- Arma el payload real, espera ~1,5 s, devuelve `folioMock` tipo `SP-2026-000148`
- Publica el producto en el marketplace en la misma operación
- Devuelve `simulado: true` — la UI **debe** mostrarlo
- ✅ **Listo cuando:** validar deja el producto visible en `/marketplace` sin pasos manuales

### `[UI][R] /marketplace con PrecioDinamico`
Esta es **la pantalla del pitch**. Es la imagen que el jurado tiene que recordar.
- Precio inicial tachado → precio actual en cobre + `−25%`
- Horas desde captura, badge de tendencia, justificación de la IA en una frase
- Contador al próximo tramo de descuento
- ✅ **Listo cuando:** con el seed cargado se ven los tres tramos (2 h, 8 h, 20 h) sin esperar nada

### `[UI][R] ConfianzaIA`
- Mostrar el % de confianza del modelo
- Si `< 0.6`: la UI **pide confirmación manual** en vez de dar el dato por bueno
- ✅ **Listo cuando:** una foto ambigua lleva al usuario a confirmar, no a un dato inventado

### `[DEMO][R+M] Video de respaldo`
Seguro de vida del pitch. Si se cae el wifi frente al jurado, el pitch sigue.
- 60-90 s, flujo completo, sin audio (Joaquín narra en vivo)
- Guardado **local** en el notebook, no en la nube
- ✅ **Listo cuando:** se reproduce sin internet

---

## Definición de "Hecho"

Una tarjeta pasa a `Hecho` solo si:

1. `npm run build` pasa
2. Está mergeada en `main`
3. Se puede **mostrar en pantalla** (si no se ve, no cuenta)
4. Si cambió un contrato de API, el doc quedó actualizado en el mismo commit
