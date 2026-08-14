# 09 · Plan de la noche

**Ahora: jueves ~22:45. Pitch: viernes 10:00.** Quedan ~11 horas, no 18.
El PRD original planificaba 18 h de trabajo: **ese plan no cabe**. Este es el plan que sí cabe,
con P1 explícitamente sacrificable.

## Cronograma

| Hora | Rubén (frontend) | Manuel (backend/IA) | Hito conjunto |
|---|---|---|---|
| **22:45–23:20** | Clonar, `npm install`, tokens de marca, layout + landing | Crear key de Gemini, crear DB en Neon, `prisma db push`, seed | ✅ **App corriendo local + deploy vacío en Vercel** |
| **23:20–00:30** | `/pescador/captura` con pestañas + subida de foto contra `mocks.ts` | `POST /api/capturas/imagen` con Gemini vision | ✅ Foto → especie + peso en pantalla |
| **00:30–01:30** | `/pescador/formulario/[id]` autocompletado + advertencias | `POST /api/capturas/voz` + `GET /api/formulario/[id]` | ✅ Voz funcionando, formulario lleno |
| **01:30–02:00** | Botón validar → envío + badge simulado | `POST /formulario/[id]/enviar` + publicación automática | ✅ **Flujo end-to-end completo** |
| **02:00–03:15** | `/marketplace` con precio, descuento, tendencia, "baja a −25% en 3 h" | `pricing.ts` + RAG de precio + `/api/marketplace/*` | ✅ **Precio bajando visible = el corazón del pitch** |
| **03:15–04:00** | `/restaurante` + pedido (P1) | matching por score (P1) | P1 — se corta sin culpa si vamos atrasados |
| **04:00–04:30** | Pulido visual, responsive, estados vacíos | Seed con datos realistas, fotos de demo en `public/demo/` | ✅ **CONGELAR ALCANCE** |
| **04:30–05:15** | Deploy final a producción, probar en móvil real, generar QR | Probar los 3 caminos de IA en el deploy, no en local | ✅ URL pública funcionando |
| **05:15–06:00** | Grabar video de respaldo del flujo completo (juntos) | | ✅ Plan B listo |
| **06:00–08:30** | **Dormir.** En serio | | |
| **08:30–09:00** | Smoke test del deploy, cargar datos frescos de demo | | ✅ Todo verde |
| **09:00–10:00** | Ensayo con Joaquín (bloque oficial de la hackathon) | | ✅ 3 min cronometrados |

## Regla de corte por hora

Si a la hora indicada el hito no está, se corta lo de abajo:

| Hora | Si no está listo... | Se corta |
|---|---|---|
| 01:30 | flujo foto → formulario | la parte de **voz** (se muestra como mockup) |
| 03:15 | precio dinámico visible | **todo P1** (restaurante y matching) |
| 04:30 | cualquier cosa | se congela: solo bugs y deploy |

**Prioridad si hay que elegir una sola cosa:** el **precio dinámico** funcionando y visible.
Es el corazón del pitch y el diferenciador. Antes que la voz, antes que el restaurante.

## Los 3 hitos que no se negocian

1. **Flujo end-to-end** (aunque sea solo con foto): captura → formulario → envío → publicado.
2. **Precio bajando visible** con justificación en pantalla.
3. **URL pública + video de respaldo.** Sin esto, el pitch no tiene evidencia verificable
   y se pierde el tramo alto del 20% de calidad de pitch.

## Setup inicial (los primeros 35 minutos, en paralelo)

**Manuel — bloqueante para todo lo demás, hacerlo primero:**

1. `GEMINI_API_KEY` en https://aistudio.google.com/apikey (free tier)
2. `DATABASE_URL` en https://neon.tech → nuevo proyecto → connection string
3. Pegar ambas en `.env.local` y **compartirlas con Rubén por canal privado** (no al repo)
4. `npx prisma db push && npm run seed`

**Rubén:**

1. `npm install && npm run dev`
2. Verificar tokens de marca en pantalla
3. `npx vercel` → deploy vacío + configurar las 2 env vars en Vercel
4. Confirmar que la URL pública carga

## Para Joaquín y Pía mientras nosotros codeamos

1. **Corregir el pitch:** 1.033 embarcaciones (no 1.200) — ver `01-contexto-problema.md`
2. **Agregar el dato de EE.UU.**: certificado de admisibilidad obligatorio desde el 1-ene-2026.
   Es el argumento más fuerte y verificable que tenemos para trazabilidad, y hoy no está en el guion
3. **Verificar o bajar el tono del 94%/6%** y del dato de merluza común
4. Conseguir el **screenshot del formulario real de SERNAPESCA** (no está en `contexto/`)
5. Alinear los nombres del cierre del pitch con el equipo real
6. Tener listas 2–3 **fotos reales de pescado** para la demo de visión
