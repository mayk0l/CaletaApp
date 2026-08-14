# Guion de Pitch — LimacheWaves · CaletaApp
*Presenta: Joaquín Rubio · Mesa 2 · Desafío 1 · 3 min presentación + 2 min preguntas + 1 min transición*

Ajustado a la rúbrica real del jurado (IA 40% · Comprensión 20% · Impacto 20% · Pitch 20%). Cada bloque está escrito para calzar con la descripción de "9-10 Sobresaliente" de cada criterio, no solo con "7-8 Logrado". Practícalo con cronómetro al menos 3 veces — en solitario los 3 minutos se sienten distinto que repartidos entre varios.

*Timing:* Problema 40s → Solución/MVP 50s → Cómo usamos la IA 40s → Impacto 30s → Cierre 20s = *180 segundos exactos*.

---

## 1. EL PROBLEMA (≈40 seg) — criterio Comprensión del desafío (20%)

> "Buenos días, somos LimacheWaves. Voy a partir con un lugar concreto: Caleta Portales, Región de Valparaíso — la tercera región con más caletas de Chile, con casi 1.200 embarcaciones y 6.000 pescadores inscritos.
>
> Ahí, el pescador artesanal enfrenta tres problemas que se refuerzan entre sí. Uno: a nivel nacional, la pesca industrial se queda con cerca del 94% de las cuotas de captura, dejando solo un 6% a los artesanales. En Caleta Portales, su recurso principal —la merluza común— lleva 13 años sobreexplotado, y la cuota 2026 baja otro 15%. Dos: sin canal de venta directo, gran parte de lo que pescan se pierde como merma. Tres: cada captura exige un formulario manual de trazabilidad de SERNAPESCA que le resta horas de mar.
>
> Esto lo validamos cruzando cifras de SUBPESCA y SERNAPESCA, contrastándolas con mentores del evento, y hoy viernes con entrevistas directas a pescadores de la caleta y a restaurantes de la región. No es un problema genérico: es específico de cómo Valparaíso vive del mar."

*Por qué apunta al 9-10:* nombra lugar y afectados concretos, aporta más de un dato duro, explica el método de validación (mentores + fuentes + entrevistas), y conecta explícitamente con la Economía Azul regional — exactamente lo que pide la rúbrica para "comprensión profunda".

---

## 2. NUESTRA SOLUCIÓN — EL MVP (≈50 seg)

> "Construimos CaletaApp. El pescador llega de faenar y registra su captura por voz o foto. La IA reconoce la especie y estima peso y tamaño de forma automática.
>
> Con esos datos, la app autocompleta el formulario real de trazabilidad de SERNAPESCA que analizamos, y el pescador solo valida antes de enviar. Al mismo tiempo, esa captura se publica automáticamente en un marketplace directo con restaurantes y hoteles de la región.
>
> Y acá está el corazón del producto: si el producto no se vende, su precio baja de forma automática y progresiva — antes de que se convierta en merma. El sistema no espera a que el pescado se pierda para reaccionar, lo anticipa."

(Mostrar QR/pantallazo del MVP en este punto — la rúbrica pide evidencia visual verificable para el tramo más alto de "Calidad del pitch".)

---

## 3. CÓMO USAMOS LA IA (≈40 seg) — criterio de mayor peso, 40%

> "Usamos IA en tres puntos concretos. Le pedimos a un modelo de visión reconocer especie y estimar peso desde una foto, porque necesitábamos validar si era viable sin entrenar un modelo propio en 18 horas. Le pedimos a un modelo de voz extraer especie, cantidad y peso de lo que dice el pescador. Y le pedimos a un modelo con RAG cruzar clima y temporada turística para sugerir cuándo bajar el precio antes de perder el producto.
>
> Un punto donde corregimos lo que la IA proponía: nos sugirió automatizar un navegador real contra el sitio de SERNAPESCA. Lo descartamos nosotros — alto riesgo, poco tiempo, y no aportaba más puntos de IA real. Decidimos simular ese envío de forma honesta y priorizar el reconocimiento y el precio dinámico, que sí son las decisiones que reducen la merma."

*Por qué apunta al 9-10:* nombra explícitamente qué se le pidió a cada herramienta y por qué, y da un ejemplo concreto y verificable de algo que el equipo decidió corregir o descartar de lo que la IA propuso — el punto exacto que distingue "Logrado" de "Sobresaliente" en la rúbrica.

---

## 4. IMPACTO EN LA ECONOMÍA AZUL (≈30 seg)

> "El anclaje está en Caleta Portales y las caletas de Valparaíso. Los pescadores ganan menos merma y más ingreso. Los restaurantes y hoteles acceden a proveedores certificados con pedidos automatizados. SERNAPESCA gana trazabilidad más consistente.
>
> La ruta de continuidad es concreta: llevar el piloto a Valpoemprende o a CITA para validarlo con una cooperativa real de la caleta, y necesitaríamos un convenio de integración con SERNAPESCA para pasar del mock al envío real.
>
> Si un pescador de Caleta Portales usa CaletaApp, su pescado se vende antes de convertirse en merma, y sus horas de papeleo se convierten en horas de mar."

*Por qué apunta al 9-10:* nombra el adoptante posible (Valpoemprende/CITA) y qué se necesita para el siguiente paso — la rúbrica exige justo eso para el tramo más alto de impacto, no solo "nos gustaría seguir".

---

## 5. CIERRE (≈20 seg)

> "La pesca artesanal no solo alimenta a Valparaíso: la define. Con CaletaApp, LimacheWaves la ayuda a seguir a flote. Soy Joaquín, y en el equipo también están Maykol, Manuel, Pía y Matías. Gracias."

---

## Preguntas del jurado (2 min) — practica estas respuestas en voz alta

| Pregunta probable | Respuesta corta |
|---|---|
| "¿Qué le pediste tú a la IA vs. qué decidieron ustedes?" | Nombra los 3 usos de IA (visión, voz, RAG de precio) y repite el ejemplo del navegador descartado — es tu mejor evidencia de "decisión propia". |
| "¿De dónde sale el 94%/6%?" | *Ten la fuente exacta lista antes de subir al escenario.* Si no la tienes 100% clara, di "cifras que cruzamos de fuentes públicas del sector pesquero" en vez de citar algo que no puedas sostener si repreguntan. |
| "¿El envío a SERNAPESCA es real?" | No, es un mock explícito y lo decimos con honestidad — la rúbrica premia decir "qué les faltó y qué sigue", no ocultarlo. |
| "¿Por qué precio dinámico y no otra función?" | Porque en terreno confirmamos que la merma es la causa económica de fondo — es la palanca que más rápido mueve el ingreso del pescador. |
| "¿Cómo sigue esto el lunes?" | Piloto con Valpoemprende/CITA + una cooperativa real de Caleta Portales, y convenio de integración con SERNAPESCA. |

## Antes de subir al escenario
