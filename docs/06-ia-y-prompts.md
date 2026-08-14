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

### La credencial de INACAP es la de MaaS

`INACAP_API_KEY` y `MAAS_API_KEY` son **la misma credencial** (endpoint
`api-ap-southeast-1.modelarts-maas.com`). Mientras `MAAS_API_KEY` no estuvo en el
entorno, `/api/marketplace/[id]/precio` respondía siempre en modo degradado: el RAG de
precios, que es el núcleo del producto, no corría nunca. Con la variable puesta pasa a
`degradado: false` y ajusta con señales reales (medido: 12000 → 13800 CLP/kg en 6.6s).

Los 9 modelos que expone hoy ese endpoint: `deepseek-v3.2` (4.9s, JSON limpio, el
default), `DeepSeek-V3`, `deepseek-r1-250528`, `glm-5`, `glm-5.1`, `glm-5.2`,
`qwen3-32b`. Los `deepseek-v4-pro` y `deepseek-v4-flash` aparecen listados pero la key
los rechaza (`401 rejected by api key model allowlist setting`).

Se volvió a verificar que **ninguno acepta imagen ni audio**, ahora con mensajes
explícitos de la API: `glm-5.x` responde `unsupported content type: 'image_url'` y
`qwen3-32b` responde `is not a multimodal model`. Visión y voz solo pueden ir por Gemini.

---

## Cadena de modelos de Gemini, y por qué no es un modelo solo

Visión y voz no llaman a un modelo fijo: recorren una cadena y pasan al siguiente ante
un error transitorio (503, cuota agotada, timeout). Está en `MODELOS_VISION`
(`src/lib/ai/client.ts`) y se puede forzar uno solo con `GEMINI_MODEL`.

| Orden | Modelo | Medido contra la API real |
|---|---|---|
| 1 | `gemini-3.5-flash` | 503 "high traffic" en 12/12 intentos. Queda primero igual: corta en 1-3s y se usa solo cuando Google libere capacidad |
| 2 | `gemini-3.6-flash` | 3/3 OK (foto 2.2s, audio 3.8s). Es el que sostiene la demo |
| 3 | `gemini-3.5-flash-lite` | Foto en 886ms cuando responde, pero se colgó hasta el timeout en 1 de 3 |

Los 2.x quedaron fuera: están deprecados. `gemini-2.0-flash` y `gemini-2.0-flash-lite`
ya devuelven `NOT_FOUND`, y `gemini-2.5-flash` quedó con **20 requests por día**.

### Hallazgo: el razonamiento por defecto era el bug

Los endpoints de foto y voz devolvían `IA_TIMEOUT` de forma intermitente y parecía un
problema del SDK. No lo era. `gemini-2.5-flash` razona por defecto y gastaba 1000-1600
tokens de *thinking* para extraer un JSON de 6 campos:

| Config | Latencia por llamada | Tokens de thinking |
|---|---|---|
| Razonamiento por defecto | 9.5s / 9.0s / 36.1s (promedio **18.2s**) | 1608 / 1518 / 1016 |
| Razonamiento al mínimo | **886ms - 2.1s** | 0 |

Contra el timeout de 12s que había, era una carrera perdida: la mitad de las llamadas
no llegaba. Extraer campos de una foto no es un problema de varios pasos, así que el
razonamiento no aportaba nada y se pagaba en latencia.

**Gemini 3.x usa `thinkingLevel`, no `thinkingBudget`.** El `thinkingBudget` es de los
2.x y en 3.x devuelve `400 INVALID_ARGUMENT`. Hoy se manda
`thinkingConfig: { thinkingLevel: MINIMAL }` (`RAZONAMIENTO_MINIMO` en `client.ts`).

El timeout quedó en **15s por intento** y no total: con 30s la demo esperaba media
eternidad a un modelo colgado, y con 12s se cortaban respuestas buenas.

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

### Capa B — modelo de mercado: proyecta el precio (`src/lib/market/`, sin IA generativa)

Esta capa no fija el precio de venta: **proyecta hacia dónde va el mercado**, y su
salida alimenta tanto la explicación como al motor con IA de la capa D.

**1. Serie de mercado simulada** (`simulador.ts`). Cuatro variables diarias por
especie: desembarque, oleaje, índice de demanda turística y precio mayorista. No hay
valores escritos a mano: se generan desde un modelo con componentes separables y
semilla fija, así que la demo es reproducible. El precio se construye desde los
regresores, no se sortea, así que la relación oferta/clima/demanda → precio existe
de verdad en el dato.

**2. Regresión log-lineal** (`forecast.ts`):

```
log(precio) = b0 + b1·log(desembarque/media) + b2·(oleaje−media)
                 + b3·turismo + b4·finDeSemana        + shock AR(1)
```

Los coeficientes se estiman del dato por mínimos cuadrados. En log porque los
efectos son multiplicativos y así los coeficientes se leen como elasticidades.

**3. Descomposición exacta del pronóstico.** Es lo que hace auditable el número:

```
Δlog = (X_futuro − X_hoy)·β  +  (φ^h − 1)·residuo_hoy
       └─ cambio de fundamentos ─┘   └─── reversión ───┘
```

El intercepto se cancela, así que cada término es atribuible. Para el congrio el
16-08 el motor devuelve `+58.7% = oferta +35.9% · clima +6.8% · demanda +1.6% ·
finDeSemana +4.9% · reversión +2.6%`, y el producto de esos factores reconstruye
exactamente la variación total. `npm run verificar:mercado` lo comprueba.

**4. Recuperación BM25 con decaimiento por recencia** (`retrieval.ts`) sobre un
corpus **generado desde la serie** (`corpus.ts`), donde cada documento lleva las
métricas que lo respaldan. Se pasó de `titulo.includes(especie)` a BM25 porque el
substring no distingue un documento que menciona la especie una vez de otro que
habla de ella todo el tiempo, y trataba igual un dato de hoy que uno de hace tres
semanas — en pescado fresco la recencia es media señal. Sigue sin ser embeddings:
con decenas de documentos BM25 rinde igual y no cuesta una llamada de red.

Resultados medidos (datos simulados, 13 especies): **MAPE 3.7-7.1% contra 9.4-20.0%
de la predicción ingenua**, le gana en 13/13 especies, cobertura de banda 76%.

`GET /api/precios/prediccion?especie=congrio&dias=7` expone la proyección día por
día con banda del 80%, la descomposición por factor, los coeficientes estimados y la
validación fuera de muestra.

### Capa C — LLM que redacta (Huawei MaaS · DeepSeek-V3.2)

En `POST /api/marketplace/[id]/precio` y en `GET .../sugerencia`, al modelo de
lenguaje no se le pide un precio: recibe el número ya decidido, la descomposición y
la evidencia, y su tarea es redactar una frase que cite una cifra concreta. Si se
cae, queda la justificación de plantilla (`explicadoPorIa: false`) y el número sigue
en pie.

### Capa D — la IA decide el precio (`src/lib/ai/precio-ia.ts`)

`GET /api/marketplace/[id]/precio-ia` invierte el reparto de las capas anteriores:
**el número lo propone la IA**, no un motor determinista. Es el uso que la hackathon
pide de una IA — que analice datos y genere la propuesta— y merece ser explícito
sobre cómo se sostiene.

El modelo recibe un expediente con datos calculados, no frases: serie histórica y su
variación semanal, pronóstico a 3 días de la capa B, elasticidad estimada a la
oferta, calidad del modelo (R² y MAPE contra el ingenuo, para que sepa cuánto
creerle), señales vigentes, evidencia recuperada con métricas, vida útil de la
especie y porcentaje consumido, y las dos referencias deterministas para comparar.

Devuelve precio, confianza propia, razonamiento paso a paso, los `[id]` de los datos
que usó y el riesgo que ve.

**Que razona sobre los datos y no copia la referencia** se comprueba con un caso: un
congrio a 90% de vida útil, con el pronóstico de mercado en +58% para el día
siguiente, recibe propuesta de **bajar** el precio, y el razonamiento dice "el
pronóstico alcista es para mañana y pasado, pero el producto no aguantará tanto
tiempo". Resuelve un conflicto entre dos señales opuestas ponderando la
perecibilidad. El mismo congrio recién desembarcado recibe lo contrario: subir.
Un sistema de puntos fijos sumaría y daría el resultado inverso.

**Barreras, porque una IA que decide números necesita red:**

| Barrera | Qué hace |
|---|---|
| Rango 60-115% del precio base | Un error del modelo no puede volverse un precio imposible. `fueAcotado` avisa cuando actúa |
| Fallback determinista | Si el modelo falla o devuelve algo inservible, decide el motor de reglas con `decidioIa: false` |
| No escribe | Es propuesta, no precio publicado. El pescador decide |
| Desvío expuesto | Cada respuesta trae cuánto se apartó de las dos referencias |
| Cita obligatoria | Se le exige nombrar los `[id]` que pesaron |

**El costo honesto:** dos consultas con el mismo insumo dan precios levemente
distintos (se midió $5500 y $5400 en corridas consecutivas, 2% de diferencia).
Es inherente a que decida un LLM; se reduce con temperatura 0.2 y no desaparece.
La contrapartida es el rango acotado y el fallback determinista.

Verificación con llamadas reales: `npm run verificar:precio-ia` recorre cuatro
escenarios construidos para que la respuesta correcta sea distinta en cada uno, y
comprueba que la reducción crece con la vida útil consumida, que toda propuesta cita
datos y que no devuelve el mismo número para todo.

**Por qué el límite de ±15% en la capa C y 60-115% en la capa D:** el modelo puede
proyectar +58% en un día de marejada y eso es correcto como lectura de mercado, pero
mover el precio de venta así de golpe no es defendible. Los topes son decisiones de
producto, no del modelo.

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
| Un modelo de visión fijo | Cadena `gemini-3.5-flash` → `3.6-flash` → `3.5-flash-lite` con fallback ante error transitorio | Medido: `3.5-flash` da 503 en 12/12 intentos y la cuota gratuita es de 20 req/día **por modelo**. Con un modelo fijo la demo se cae; con la cadena se recupera sola y cada modelo aporta su propio cupo |
| Dejar el razonamiento del modelo en su default | `thinkingLevel: MINIMAL` | El razonamiento por defecto costaba 1000-1600 tokens y 18.2s promedio para un JSON de 6 campos, contra un timeout de 12s. Al mínimo baja a 886ms-2.1s sin perder calidad |
| Un solo timeout para todas las llamadas de IA | 12s para texto, 15s **por intento** para multimodal | Foto y audio suben binario en base64 y tienen cola de latencia larga (se midió hasta 48s con el modelo saturado). El timeout único era la causa real de los `IA_TIMEOUT` |
