# 09 · Plan de la noche

**Ahora: viernes 00:33. Pitch: 10:00.** Quedan ~9,5 horas, y hay que restar dormir (~2,5 h) y
ensayo (1 h). **Trabajo real disponible: ~6 horas.** Con esto, el alcance se corta a lo
imprescindible: nada de voz, nada de restaurante, nada de matching. Solo el flujo de foto y
el precio dinámico — que es lo que efectivamente carga el 40% de IA y el corazón del pitch.

## Cronograma (recortado a 6 horas reales)

| Hora | Rubén | Manuel | Hito |
|---|---|---|---|
| **00:35–01:00** | CA-20 deploy vacío en Vercel | CA-01 Gemini key · CA-02 Neon + seed | ✅ URL pública viva + BD con datos |
| **01:00–02:15** | CA-21 captura por foto contra mocks | CA-03 visión end-to-end | ✅ Foto → especie + peso en pantalla |
| **02:15–03:00** | CA-24 formulario editable + enviar | CA-06 formulario · CA-07 enviar y publicar | ✅ **Flujo completo: foto → formulario → publicado** |
| **03:00–04:15** | CA-25 marketplace real | CA-08 marketplace · CA-10 precio (RAG simplificado o solo regla base) | ✅ **Precio bajando visible = el corazón del pitch** |
| **04:15–04:45** | CA-28 fotos de demo probadas + pulido rápido | CA-05 manual como fallback | ✅ **CONGELAR ALCANCE** |
| **04:45–05:15** | CA-29 deploy final + QR + prueba en móvil | verificar visión y precio en producción | ✅ URL pública lista |
| **05:15–05:45** | CA-40 video de respaldo (juntos) | | ✅ Plan B grabado |
| **05:45–08:15** | **Dormir.** | | |
| **08:15–08:45** | CA-41 smoke test en producción | | ✅ Todo verde |
| **08:45–10:00** | Ensayo con Joaquín | | ✅ 3 min cronometrados |

**Lo que se corta sin discusión, ya:** voz (CA-04, CA-22), restaurante y matching (CA-50 a CA-54),
historial de capturas (CA-26), sello certificado (CA-52), login (CA-53). Si a las 04:15 sobra
tiempo, se retoma la voz primero — es lo único de esa lista con peso real en el 40% de IA.

## Regla de corte por hora

Si a la hora indicada el hito no está, se corta lo de abajo:

| Hora | Si no está listo... | Se corta |
|---|---|---|
| 03:00 | flujo foto → formulario | CA-10 se reduce a solo la regla determinista, sin capa RAG |
| 04:15 | precio dinámico visible | ya no queda nada más que cortar: es la línea de fondo |
| 04:45 | cualquier cosa | se congela: solo bugs y deploy |

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
