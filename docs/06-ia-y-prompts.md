# 06 · IA: usos, prompts y fallbacks

El 40% de la nota viene de acá. Lo que se evalúa no es cuánta IA usamos, sino
**si cada uso es apropiado, si sabemos qué le pedimos y qué decidimos nosotros.**

## Dos proveedores, cada uno donde es fuerte

Huawei nos dio acceso a 5 modelos para la hackathon (GLM-5.2, GLM-5.1, GLM-5,
DeepSeek-V3.2, Qwen3-32B) vía ModelArts MaaS, API compatible con OpenAI.
**Los probamos contra la API real: los 5 son solo de texto.** No hay ningún modelo
con capacidad de imagen bajo este acceso (confirmado con 404 al probar nombres
de modelos VL conocidos como `glm-4v`, `qwen-vl`, etc.).

Por eso quedó así:

| Uso | Proveedor | Por qué |
|---|---|---|
| Visión (foto → especie + peso) | **Gemini** (`GEMINI_API_KEY`) | Es el único de los dos con capacidad de imagen |
| RAG de precios (el núcleo) | **Huawei MaaS** (`MAAS_API_KEY`, DeepSeek-V3.2) | Dado por los organizadores, y es justo el uso de texto |

Esto es un argumento a favor para el pitch, no una debilidad: evaluamos qué modelo
sirve para cada tarea en vez de forzar todo a un solo proveedor.

### Hallazgo importante: elegir bien DENTRO de los 5 modelos de Huawei

Medimos el tiempo de respuesta de los 5 modelos con la misma llamada trivial:

| Modelo | Tiempo | Uso |
|---|---|---|
| GLM-5.2 | ~13 s | ❌ Es un modelo de razonamiento: gasta ~340 tokens "pensando" antes de responder |
| GLM-5.1 | ~12 s | ❌ Mismo problema |
| GLM-5 | ~15 s | ❌ Mismo problema, el más lento |
| **DeepSeek-V3.2** | **~3 s** | ✅ Elegido por defecto (`MODELO_TEXTO` en `client.ts`) |
| Qwen3-32B | ~6 s | Alternativa si DeepSeek falla |

La familia GLM disponible acá es de razonamiento extendido y no cabe en un timeout
de demo en vivo. Si se hubiera usado GLM a ciegas, el precio dinámico —el corazón
del producto— habría tardado 13+ segundos en pantalla frente al jurado. Se descubrió
probando contra la API real, no asumiendo por el nombre del modelo.

---

Toda llamada pasa por `src/lib/ai/client.ts` — nadie llama a un SDK o hace fetch
directo desde una route.

## Reglas transversales

1. **Salida estructurada obligatoria.** Se pide JSON con schema; nunca parsear prosa.
2. **Timeout de 12 s** en toda llamada. Vencido el plazo → fallback, no pantalla colgada.
3. **Se guarda la respuesta cruda** en `Captura.iaRaw`. Es nuestra evidencia ante el jurado.
4. **La confianza se muestra al usuario.** Si `confianza < 0.6`, la UI pide confirmación manual
   en vez de dar el dato por bueno. Un modelo honesto sobre su incertidumbre es mejor demo que
   uno que finge certeza — y es exactamente el tipo de decisión que la rúbrica premia.

---

## Uso 1 · Visión: especie + peso desde foto

**Qué le pedimos y por qué:** clasificar entre un conjunto **cerrado** de 3 especies y estimar
talla/peso usando referencias visuales. Cerramos el catálogo a propósito: un clasificador abierto
alucina especies que no existen en la región. Restringir el espacio de salida es una decisión
nuestra, no del modelo.

```
Eres un asistente de trazabilidad pesquera en la Región de Valparaíso, Chile.
Analiza la foto de una captura de pesca artesanal.

Identifica la especie SOLO entre: congrio, jaiba, jibia.
Si no corresponde a ninguna, devuelve especie "desconocida" con confianza baja.
No inventes una especie que no esté en la lista.

Estima largo (cm) y peso (kg) usando objetos de referencia visibles
(mano, caja pesquera, guante, cubierta). Indica en "notas" qué referencia usaste.
Si no hay referencia de escala, baja la confianza y dilo en "notas".

Responde SOLO este JSON:
{"especie": string, "confianza": number 0-1, "largo_cm_estimado": number,
 "peso_kg_estimado": number, "cantidad": number, "notas": string}
```

**Fallback:** `confianza < 0.6` o error → el frontend abre el formulario manual con los campos
vacíos y un aviso. No se bloquea el flujo.

---

## Uso 2 · Voz: extracción de entidades del habla del pescador

**Qué le pedimos y por qué:** Gemini procesa el audio directamente, así que no montamos un
speech-to-text aparte. Le pedimos transcribir **y** extraer entidades en una sola pasada:
menos latencia, menos integración, menos que se caiga en vivo.

```
Escucha el audio de un pescador artesanal chileno describiendo su captura.
Habla informal, con modismos y nombres locales de especies.

1) Transcribe literal.
2) Extrae los datos de la captura.

Normaliza la especie a: congrio, jaiba, jibia (o "desconocida").
Si dice peso total en vez de peso por unidad, calcula el unitario y dilo en "notas".
Si un dato no se menciona, usa null. No inventes.

Responde SOLO este JSON:
{"transcripcion": string, "especie": string, "cantidad": number|null,
 "peso_unitario_kg": number|null, "peso_total_kg": number|null,
 "confianza": number 0-1, "notas": string}
```

Ejemplo esperado: *"traje dos congrios de tres kilos cada uno"*
→ `{especie: "congrio", cantidad: 2, peso_unitario_kg: 3, peso_total_kg: 6}`

**Fallback:** si no hay micrófono o falla el audio → foto o manual.

---

## Uso 3 · Precio dinámico con RAG (el corazón del producto)

Dos capas, y el orden importa.

### Capa A — regla determinista (`src/lib/pricing.ts`, sin IA)

```
0–6 h    → 0% descuento     (producto fresco, precio base)
6–12 h   → 10%
12–24 h  → 25%
24–36 h  → 40%
>36 h    → marcar riesgo de MERMA
```

Es una función pura, testeable, y **funciona sin internet**. Si Gemini se cae durante el pitch,
el feature central sigue en pantalla. Esa fue una decisión de diseño, no un accidente.

### Capa B — RAG que ajusta y explica (Huawei MaaS · DeepSeek-V3.2)

1. Base de conocimiento en `src/data/knowledge/senales-mercado.json`: señales de clima,
   temporada turística de Valparaíso y oferta regional por especie. Estructura real,
   valores **simulados y rotulados**, salvo 2 que citan el boletín real de SERNAPESCA.
2. **Recuperación por keyword-matching**, no por embeddings vectoriales. Decisión de
   tiempo: con ~10 documentos, una vector DB o coseno con embeddings es sobreingeniería
   frente al tiempo disponible — matching de palabras sobre título/contenido da resultados
   igual de buenos y se implementa en minutos. Ver `recuperarSenales()` en `price-rag.ts`.
3. Se priorizan las señales que mencionan la especie; si no alcanzan, se completa con
   clima/temporada. Top-3.
4. Al modelo se le pasa: precio base, descuento por regla, señales recuperadas.

```
Eres analista de precios de pesca artesanal en Valparaíso, Chile.

Producto: {especie}, {peso} kg, publicado hace {horas} horas.
Precio base: ${precio_base}/kg
Descuento por tiempo (regla base ya aplicada): {descuento}% → ${precio_regla}/kg

Señales de contexto recuperadas:
{senales}

Ajusta el precio SOLO si las señales lo justifican, dentro de ±15% del precio de la regla base.
La justificación debe nombrar la señal concreta que usaste. No inventes señales.
Máximo 20 palabras, en español de Chile, dirigida al pescador.

Responde SOLO este JSON:
{"precio_sugerido": number, "tendencia": "alcista"|"bajista"|"estable",
 "justificacion": string, "senales_usadas": string[]}
```

**Por qué el límite de ±15%:** sin él el modelo propone precios absurdos y perdemos control de la
demo. Es una restricción que pusimos nosotros al ver la salida del modelo — buen material para
la pregunta "¿qué corrigieron de lo que la IA proponía?".

**Fallback:** error o timeout → se devuelve el precio de la regla base con `degradado: true`
y la UI dice "ajustado por regla base".

---

## Uso 4 (P1) · Matching pedido → captura: sin IA, a propósito

Filtrado y scoring por reglas explícitas (especie exacta, frescura, cantidad, caleta).
**No usamos un LLM acá**: para 3 especies y 10 productos, un modelo agrega latencia,
costo y no-determinismo sin mejorar el resultado.

Decir esto en el pitch **suma** en el criterio de uso *apropiado* de IA: demuestra que
distinguimos dónde la IA aporta y dónde es decoración.

---

## Qué decidimos nosotros contra lo que la IA propuso

Guardar esta lista: es la respuesta a la pregunta que más puntaje mueve.

| La IA/el plan inicial proponía | Qué decidimos | Por qué |
|---|---|---|
| Automatizar el portal real de SERNAPESCA con navegador headless | Descartado, mock explícito | Alto riesgo de bloqueo, tiempo de debug impredecible, cero puntos extra de IA |
| Backend en FastAPI + frontend Next.js | Todo en Next.js | Dos deploys y CORS con 2 devs y 10 horas era plomería sin retorno |
| Speech-to-text separado + LLM de extracción | Gemini multimodal en una pasada (voz queda fuera de esta noche por tiempo, ver `docs/09-plan-noche.md`) | Una integración menos que puede fallar en vivo |
| Un solo proveedor de IA para todo | Gemini para visión + Huawei MaaS (DeepSeek-V3.2) para el RAG de precios | Huawei no ofrece ningún modelo con capacidad de imagen bajo este acceso (confirmado con 404 contra la API real); cada proveedor donde es fuerte |
| GLM-5.2 como modelo de texto (el "más nuevo" de los 5 de Huawei) | DeepSeek-V3.2 | Medido contra la API real: GLM-5.x son modelos de razonamiento y tardan 11-15s incluso para un JSON trivial. DeepSeek-V3.2 respondió en ~3s |
| Vector DB para el RAG | Keyword-matching en memoria sobre ~10 docs | Sobreingeniería para el tamaño real del problema y el tiempo disponible |
