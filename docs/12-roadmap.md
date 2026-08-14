# Roadmap — próximos pasos post-hackathon

Estado: **14-08-2026, post-pitch Ocean Lab Hackathon**.
Este doc recoge lo que se quedó fuera de alcance del prototipo y cómo abordarlo.

---

## 1. Reconocimiento por visión (mejora de precisión)

Hoy `src/lib/ai/vision.ts` usa un modelo generalista (Gemini) con un prompt de zero-shot
restringido al catálogo de especies. Funciona, pero no es suficiente para producción:
confunde especies similares, no estima peso bien sin referencia de escala, y la cantidad
es un acierto suelto.

### Líneas de trabajo (en orden de impacto/costo)

1. **Few-shot con ejemplos reales de la región.**
   - Armar un dataset de ~50 fotos por especie (congrio, jaiba, jibia, corvina, reineta, …)
     tomadas en caletas de Valparaíso, con especie/peso/largo verificados.
   - Incluir 2-3 ejemplos en el prompt (vision.ts) como few-shot inline (base64).
   - Esto solo ya sube precisión notablemente sin entrenar nada.

2. **Referencia de escala obligatoria.**
   - Pedir al pescador una foto con un objeto de tamaño conocido (caja pesquera, guante,
     billete) o un HUId de referencia impreso.
   - El prompt usa ese objeto para derivar largo → peso con una fórmula especie-específica
     (peso ≈ k · largo^b, calibrada por especie con datos de SERNAPESCA).

3. **Fine-tuning de un modelo de visión.**
   - Cuando el dataset pase de ~500 fotos etiquetadas, fine-tunear un modelo pequeño
     (ej. SigLIP o un ViL adaptado) para clasificación de especies regionales.
   - Mantener el modelo generalista como fallback: si el fine-tuned da confianza < 0.5,
     pasar la foto al generalista y comparar.

4. **Detección de cantidad y talla.**
   - Usar un detector de objetos (ej. YOLO fine-tuneado) para contar individuos en la foto.
   - Para talla: segmentar cada individuo y medir contra la referencia de escala.

5. **Validación contra normativa.**
   - Cruzar talla estimada con `TALLA_MINIMA_CM` (ya en `src/lib/mocks.ts`) y marcar
     advertencias automáticas (ya lo hace el formulario, pero hoy la talla viene de la IA).

### Métricas a perseguir
- Precisión top-1 de especie ≥ 85% en un set de validación regional.
- Error de peso ≤ 15% del real.
- Cobertura de especies del catálogo ampliada (hoy 13, objetivo ~20 regionales).

---

## 2. Reconocimiento por voz

Hoy `src/lib/ai/voice.ts` transcribe y extrae en una sola pasada. Transcribe bien, pero
la normalización al catálogo perdía especies fuera de las 3 originales. **Ya corregido**:
el catálogo se amplió a 13 especies regionales + "otra".

### Próximos pasos
- **Diccionario de sinónimos locales:** mapear nombres coloquiales ("congrio colorado",
  "bacalao de Juan Fernández", "pota") al catálogo canónico antes de mandar al modelo.
- **Confirmación oral:** si la confianza es baja, pedir al pescador que confirme la especie
  por voz ("¿corvina o reineta?") y usar la respuesta para corregir.
- **Manejo de peso total vs unitario:** hoy se le pide al modelo que lo infiera; robustecer
  con un paso de clarificación si hay ambigüedad.

---

## 3. Autenticación (login pescador + restaurante)

Hoy la sesión es mock (`PESCADOR_DEMO` + `<BadgeSimulado texto="sesión simulada" />`).
No es prioritario para el hackathon, pero es bloqueante para producción.

### Plan
- **Auth ligera con NextAuth (Auth.js) + credentials provider** contra una tabla `Usuario`
  (pescador/restaurante, rol). Sin OAuth externo por ahora.
- **Sesión por cookie** (httpOnly). Los endpoints de `capturas`, `formulario/enviar` y
  `pedidos` ya están identificados como needing auth (ver `HANDOFF.md` §3).
- **Autorización por rol:** el pescador solo edita sus capturas/productos; el restaurante
  solo ve sus pedidos. Hoy los endpoints son abiertos (decisión de demo).
- **Onboarding de pescador:** alta con RPA + caleta verificada contra padrón de SERNAPESCA
  (hoy mock).

---

## 4. Edición de datos (hecho en esta sesión)

- ✅ El pescador puede **editar especie/cantidad/peso/largo** tras el reconocimiento de IA
  antes de continuar al formulario (`PATCH /api/capturas/[id]`).
- ✅ El pescador puede **definir/editar el precio base** de sus productos
  (`PATCH /api/productos/[id]`, vista "Mis productos" en `/pescador`).
- Pendiente: **editar campos del formulario** (aparejo, zona, hora) — hoy son solo lectura.
  Sería un `PATCH /api/formulario/[id]` + inputs en la vista.

---

## 5. Inyección y uso de la información

Mejorar cómo los datos fluyen captura → IA → formulario → marketplace:

- **Trazabilidad de la IA:** ya guardamos `iaRaw` en `Captura` como evidencia. Formalizar
  un log de decisiones (qué prompt, qué modelo, confianza, tiempo) para auditoría.
- **Feedback loop:** cuando el pescador corrige un dato de IA (especie/peso), guardar la
  corrección como dato de entrenamiento implícito (input → predicción → corrección humana).
  Eso alimenta el fine-tuning de §1.
- **RAG de precios con señales reales:** hoy `price-rag.ts` usa señales mock. Conectar a
  fuentes reales (pronóstico meteorológico, landing de caletas) cuando existan.

---

## 6. Captura por foto: cámara + galería (hecho)

- ✅ El tab de foto ahora ofrece dos opciones: **tomar foto (cámara)** o **elegir desde
  galería**. Antes solo abría la cámara forzada.

---

## 7. Fiabilidad de la IA (hecho en esta sesión)

- ✅ **`IA_TIMEOUT` intermitente en foto y voz, resuelto.** No era el SDK: el modelo
  razonaba por defecto y gastaba 1000-1600 tokens de *thinking* para un JSON de 6 campos
  (promedio 18.2s) contra un timeout de 12s. Detalle y mediciones en
  `docs/06-ia-y-prompts.md`.
- ✅ **Cadena de modelos con fallback** ante 503 / cuota agotada / timeout, en vez de un
  modelo fijo.
- ✅ **Errores de IA distinguibles**: `IA_CUOTA` (429) e `IA_SOBRECARGA` (503) dejaron de
  disfrazarse de `IA_SIN_RESULTADO`.
- ✅ **RAG de precios operativo**: faltaba `MAAS_API_KEY` en el entorno (es la misma
  credencial que `INACAP_API_KEY`), así que corría siempre en modo degradado.

### Pendiente
- **Cuota gratuita:** el tier free da ~20 requests/día **por modelo**. Para una demo con
  público conviene una key con billing o precalentar resultados de ejemplo.
- **Latencia de voz:** el camino de audio queda en 19-30s cuando los dos primeros modelos
  de la cadena fallan. Comprimir el audio antes de subirlo (el navegador ya manda
  webm/opus, 11x más chico que wav) y evaluar `gemini-3.6-flash` como primario si Google
  no libera capacidad en `3.5-flash`.

---

## 8. Deuda de entorno (bloqueante para levantar el proyecto)

- **`DATABASE_URL` vs `schema.prisma`:** el schema declara `postgresql` y el entorno local
  traía `file:./caleta.db` (sqlite), así que **todos** los endpoints que tocan la DB
  respondían 500 (`the URL must start with the protocol postgresql://`). No hay ninguna URL
  de Neon en el entorno ni Postgres local. Para desarrollo se usó un schema aparte
  (`prisma/schema.sqlite.prisma`, no versionado) sin tocar el `schema.prisma` de la rama.
  **Decidir:** o se recupera la URL de Neon, o se asume sqlite para desarrollo y se
  documenta como tal.
- **Secretos en el historial de git:** el commit inicial `eebc6ac` incluyó
  `GEMINI_API_KEY` e `INACAP_API_KEY` reales. La rama que los contenía ya se borró del
  remoto, pero **eso no los saca de GitHub**: el commit sigue alcanzable por SHA. Hay que
  **rotar ambas keys**; es el único arreglo real.
- **Directorios sueltos sin versionar:** `backend/` y `frontend/` quedaron en el árbol de
  trabajo y no están en `.gitignore`. `frontend/.next` genera 1131 hallazgos de ESLint si
  se corre `npm run lint` sin argumentos (el código propio, `npx eslint src prisma`, está
  limpio). Conviene borrarlos o ignorarlos para que el lint del repo sea confiable.
