# 09 · Plan de la noche

**Ahora: jueves ~23:00. Pitch: viernes 10:00.** Quedan ~11 horas, no 18.
El PRD original planificaba 18 h de trabajo: **ese plan no cabe**. Este es el plan que sí cabe,
con P1 explícitamente sacrificable.

El scaffolding y la documentación (CA-00) ya están hechos y pusheados, así que el bloque de
setup arranca directo en las claves.

## Cronograma

| Hora | Rubén (frontend) | Manuel (backend/IA) | Hito conjunto |
|---|---|---|---|
| **23:00–23:30** | CA-20 deploy vacío en Vercel + env vars | CA-01 Gemini key · CA-02 Neon + seed | ✅ **URL pública viva + BD con datos** |
| **23:30–00:45** | CA-21 captura con pestañas y foto | CA-03 visión end-to-end | ✅ Foto → especie + peso en pantalla |
| **00:45–01:45** | CA-23 confianza · CA-24 formulario | CA-04 voz · CA-06 formulario | ✅ Voz funcionando, formulario lleno |
| **01:45–02:15** | CA-24 validar y enviar | CA-05 manual · CA-07 enviar + publicar | ✅ **Flujo end-to-end completo** |
| **02:15–03:30** | CA-25 marketplace real | CA-08 marketplace · CA-09 RAG · CA-10 precio | ✅ **Precio bajando visible = el corazón del pitch** |
| **03:30–04:00** | CA-26 historial · CA-50 restaurante (P1) | CA-51 matching (P1) | P1 — se corta sin culpa si vamos atrasados |
| **04:00–04:30** | CA-27 pulido | CA-28 fotos de demo probadas | ✅ **CONGELAR ALCANCE** |
| **04:30–05:15** | CA-29 deploy final + QR + prueba en móvil | verificar los 3 caminos de IA en producción | ✅ URL pública funcionando |
| **05:15–06:00** | CA-40 video de respaldo (juntos) | | ✅ Plan B listo |
| **06:00–08:30** | **Dormir.** En serio | | |
| **08:30–09:00** | CA-41 smoke test + datos frescos de demo | | ✅ Todo verde |
| **09:00–10:00** | Ensayo con Joaquín (bloque oficial de la hackathon) | | ✅ 3 min cronometrados |

## Regla de corte por hora

Si a la hora indicada el hito no está, se corta lo de abajo:

| Hora | Si no está listo... | Se corta |
|---|---|---|
| 01:45 | flujo foto → formulario | la parte de **voz** (CA-04, CA-22) se muestra como mockup |
| 03:30 | precio dinámico visible | **todo P1** (CA-50 a CA-54) |
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
