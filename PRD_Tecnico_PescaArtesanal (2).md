# PRD Técnico — Plataforma de Trazabilidad y Venta Directa para Pesca Artesanal

**Ocean Lab Hackathon 2026 · Desafío 1: Economía Azul para la Región de Valparaíso**
**Ámbito: Pesca artesanal y acuicultura — trazabilidad, comercialización directa**

---

## 1. Resumen ejecutivo

Producto que resuelve dos problemas del pescador artesanal en un solo flujo: (1) automatiza el llenado del formulario de trazabilidad de SERNAPESCA usando reconocimiento de voz e imagen, y (2) publica automáticamente la captura registrada en un marketplace que conecta al pescador con restaurantes y hoteles de la región, **reduciendo merma activamente mediante precio dinámico** y generando un nuevo canal de venta directo.

**La reducción de merma es el corazón del producto, no una consecuencia secundaria.** El mecanismo central: a medida que un producto publicado no se vende, su precio baja de forma automática y progresiva — antes de que se pierda como merma. Este ajuste se alimenta de un modelo con RAG que incorpora variables de contexto (clima, temporada turística, disponibilidad simulada de otros pescadores) para sugerir al pescador tendencias alcistas o bajistas de precio, no solo reaccionar cuando ya es tarde.

**Ventana de desarrollo:** ~18 horas (hoy hasta mañana 10:00 am, presentación de pitch a las 10:00-11:30).

---

## 2. Objetivo del MVP

Demostrar, con un demo funcional end-to-end (aunque acotado en alcance), el flujo completo:

`Captura (foto/voz) → IA extrae datos → Autollenado de formulario → Validación pescador → Envío mock a SERNAPESCA → Publicación automática en marketplace`

**No es objetivo del MVP:** integración real con SERNAPESCA, sistema de pagos, autenticación robusta, escalabilidad, multi-tenant real. Todo eso se menciona como roadmap en el pitch, no se construye.

---

## 3. Alcance funcional (priorizado)

| # | Feature | Prioridad | Motivo |
|---|---|---|---|
| 1 | **Precio dinámico decreciente por producto no vendido, con predicción vía RAG** (clima, temporada turística, disponibilidad simulada) | **P0** | Ataca directamente la causa raíz del problema: la merma. Es el mecanismo que conecta narrativa de impacto con uso real de IA |
| 2 | Reconocimiento de especie + estimación de peso/tamaño por foto (mín. 2 especies) | **P0** | Criterio de mayor peso en evaluación (40% uso de IA) |
| 3 | Autollenado del formulario SERNAPESCA (mock) a partir del screenshot real | **P0** | Insumo ya disponible, alto impacto visual en demo |
| 4 | Registro de captura por voz (especie, cantidad, peso aproximado) | **P0** | Segundo pilar de IA, técnicamente de bajo riesgo |
| 5 | Publicación automática en marketplace tras validación | **P1** | Cierra el flujo narrativo del pitch, y es donde vive el precio dinámico |
| 6 | Vista de restaurante/hotel: pedido vía chat/plantilla + matching IA | **P1** | Si el tiempo alcanza; si no, se muestra como mockup estático |
| 7 | Sello "Pesca Artesanal Certificada" en perfil de restaurante | **P2** | Visual, bajo esfuerzo, alto valor narrativo |
| 8 | Login/validación de identidad del pescador | **P2** | Mock explícito, sin manejo real de credenciales |

---

## 4. Stack técnico

Elegido por **velocidad de desarrollo y familiaridad del equipo**, no por escalabilidad — es un hackathon de jornada y media.

| Capa | Tecnología | Motivo |
|---|---|---|
| Frontend | **Next.js (App Router) + TypeScript + Tailwind** | Rápido de levantar, buen soporte de componentes, fácil de desplegar en Vercel para el demo en vivo |
| Backend | **FastAPI (Python)** | Rápido para exponer endpoints, tipado con Pydantic, ecosistema Python facilita integración con APIs de IA |
| Base de datos | **SQLite** (o Postgres en Supabase si ya tienen cuenta) | Cero fricción de setup; SQLite alcanza sobradamente para una demo de 18h |
| Reconocimiento de imagen | **API de modelo multimodal (vision-language)** vía prompt engineering | No entrenar modelo propio — alto riesgo, bajo tiempo. Un modelo con visión ya resuelve clasificación de especie + estimación aproximada de peso/tamaño con buen prompting |
| Reconocimiento de voz | **API de speech-to-text** + extracción de entidades con LLM (mismo proveedor) | Evita mantener dos integraciones distintas |
| Autollenado de formulario | Backend arma el JSON estructurado → **renderiza el formulario mock en el frontend** replicando el screenshot real de SERNAPESCA | No es necesario automatizar un navegador real (Playwright) para la demo; renderizar el mock es más rápido y controlable en vivo |
| Hosting demo | **Vercel** (frontend) + **Railway o Render** (backend) | Deploy en minutos, URLs públicas para el pitch |
| Control de versiones | GitHub, un repo mono con `/frontend` y `/backend` | Simplifica coordinación de equipo en tiempo reducido |

**Nota sobre el "cronjob simulado":** dado el tiempo disponible, se recomienda **no** automatizar un navegador real contra la página de SERNAPESCA (riesgo alto, posible bloqueo, tiempo de debug no controlable). En su lugar, el "envío" se simula: el backend arma el payload como si fuera a enviarse, muestra un estado de carga, y devuelve una confirmación mock. Esto se explica honestamente en el pitch como el approach de demo, con el cronjob real como parte del roadmap post-hackathon.

---

## 5. Arquitectura (alto nivel)

```
┌─────────────────┐        ┌──────────────────┐        ┌───────────────────┐
│   Next.js App    │──────▶│   FastAPI Backend  │──────▶│  APIs de IA (ext.)  │
│                   │◀──────│                    │◀──────│  visión / voz / LLM │
│ - Login mock      │        │ - /capturas        │        └────────────────────┘
│ - Captura (foto/  │        │ - /formulario       │
│   voz/manual)     │        │ - /marketplace       │
│ - Formulario       │        │ - /pescadores        │
│   validación       │        │ - /restaurantes       │
│ - Marketplace       │        └──────────────────┘
│ - Vista restaurante │                 │
└─────────────────┘                 ▼
                              ┌──────────────┐
                              │   SQLite/PG   │
                              └──────────────┘
```

---

## 6. Modelo de datos (mínimo viable)

```
Pescador
- id, nombre, caleta, region, registro_sernapesca_mock

Captura
- id, pescador_id, especie, peso_estimado, largo_estimado,
  metodo_registro (foto|voz|manual), foto_url, timestamp, estado (pendiente|validada|enviada)

FormularioTrazabilidad
- id, captura_id, campos_estaticos (json), campos_variables (json), estado_envio (mock)

ProductoMarketplace
- id, captura_id, especie, cantidad, precio_inicial, precio_actual,
  timestamp_publicacion, ultima_actualizacion_precio, estado (disponible|reservado|vendido)

SeñalMercado (simulada, alimenta el RAG de precios)
- id, tipo (clima|temporada_turistica|disponibilidad_regional), valor, fecha, fuente_o_simulada

Restaurante
- id, nombre, sello_certificado (bool)

Pedido
- id, restaurante_id, especie_solicitada, cantidad, estado (cola|match|resuelto)
```

---

## 7. Endpoints backend (FastAPI) — MVP

```
POST   /api/capturas/imagen        → recibe foto, llama API visión, retorna especie+peso estimado
POST   /api/capturas/voz           → recibe audio, transcribe + extrae entidades
POST   /api/capturas/manual        → registro manual (fallback)
GET    /api/formulario/{captura_id} → arma el JSON del formulario autocompletado
POST   /api/formulario/{captura_id}/validar → pescador confirma, dispara envío mock
POST   /api/formulario/{captura_id}/enviar  → simula envío a SERNAPESCA, retorna confirmación
POST   /api/marketplace/publicar/{captura_id} → publica producto tras validación, fija precio_inicial
GET    /api/marketplace                → lista productos disponibles con precio_actual
POST   /api/marketplace/{producto_id}/actualizar-precio → recalcula precio_actual según tiempo sin venta + señales de mercado (RAG)
GET    /api/marketplace/{producto_id}/prediccion → devuelve tendencia sugerida (alcista/bajista) y por qué
POST   /api/pedidos                    → restaurante crea pedido (chat o form)
GET    /api/pedidos/match/{pedido_id}  → matching simple (por especie/cercanía/disponibilidad)
```

---

## 8. Prompt/lógica de IA (guía para el equipo)

**Reconocimiento de imagen (especie + peso/dimensión aproximada):**
- Prompt al modelo multimodal: pedir identificación de especie (limitar a las 2-3 especies objetivo del demo para mayor precisión), y estimación de largo/peso usando como referencia un objeto conocido en la foto (mano, caja, guante) si está presente.
- Devolver JSON estructurado: `{especie, confianza, largo_cm_estimado, peso_kg_estimado}`.

**Reconocimiento de voz:**
- Transcribir audio → pasar transcripción a LLM con instrucción de extraer: especie, cantidad, peso aproximado, en JSON.
- Ejemplo de entrada: *"traje dos congrios de tres kilos cada uno"* → `{especie: "congrio", cantidad: 2, peso_unitario_kg: 3}`.

**Precio dinámico con RAG (mecanismo central de reducción de merma):**
- Regla base: el precio de un producto publicado decrece de forma automática y progresiva mientras más tiempo pasa sin venderse (ej. cada N horas sin venta, aplicar un descuento escalonado) — esto ya reduce merma aunque el RAG falle o esté incompleto, así que es el fallback seguro.
- Capa RAG: se construye una base de conocimiento simulada con variables de contexto (pronóstico de clima de la zona, calendario de temporada turística de Valparaíso, disponibilidad simulada de otros pescadores/especies). El LLM consulta esa base para ajustar la velocidad de la baja de precio y generar una sugerencia explicable: "tendencia alcista por fin de semana largo + baja disponibilidad" o "tendencia bajista por sobreoferta de la especie esta semana".
- Output esperado: `{precio_sugerido, tendencia (alcista|bajista|estable), justificación_breve}` — la justificación es clave para el pitch, porque muestra que el sistema no solo predice sino que explica el porqué (relevante para el criterio de uso "apropiado e innovador" de IA, no solo automatizado).
- Para la demo: los datos de clima/temporada pueden ser simulados/hardcodeados con valores realistas de agosto en Valparaíso — no es necesario conectarse a una API real de clima dado el tiempo disponible, pero se debe explicitar en el pitch que son datos simulados con estructura real.

**Matching pedido-proveedor (simplificado para demo):**
- Regla simple, no necesita ser un modelo complejo: filtrar productos disponibles por especie solicitada, ordenar por cantidad disponible y timestamp de captura (más fresco primero). Esto ya es defendible como "IA aplicada a matching" si se enmarca como sistema de recomendación basado en reglas + score, y se puede mencionar como candidato a modelo de recomendación más sofisticado en la siguiente iteración.

---

## 9. Plan de trabajo por bloques (18 horas)

| Bloque | Horas | Foco |
|---|---|---|
| Setup | 1h | Repo, scaffolding Next.js + FastAPI, deploy inicial vacío funcionando |
| Bloque 1 | 2.5h | Reconocimiento de imagen funcionando end-to-end (foto → API → resultado en pantalla) |
| Bloque 2 | 1.5h | Reconocimiento de voz funcionando end-to-end |
| Bloque 3 | 2.5h | Formulario mock de SERNAPESCA (replicar screenshot) + autollenado con datos de captura |
| Bloque 4 | 1.5h | Flujo de validación → envío mock → publicación en marketplace |
| Bloque 5 | 2.5h | **Precio dinámico**: regla de decrecimiento por tiempo + capa RAG con señales simuladas + endpoint de predicción con justificación |
| Bloque 6 | 1.5h | Vista marketplace mostrando precio bajando en vivo + vista restaurante simplificada + sello certificado |
| Buffer/pulido | 3h | Bugs, UI, datos de prueba realistas, ensayo del pitch con el demo real |
| Pitch prep | 2h | Guion, ensayo con timing (3 min), preparar fallback en video/capturas por si falla internet en vivo |

**Recomendación crítica:** grabar un video corto del flujo funcionando como respaldo, por si el demo en vivo falla frente al jurado (conectividad, API caída, etc.). Es una práctica estándar en hackathons y reduce el riesgo del pitch a cero.

---

## 10. Riesgos técnicos y mitigación

| Riesgo | Mitigación |
|---|---|
| API de visión no reconoce bien las especies elegidas | Elegir 2 especies con apariencia muy distintiva (ej: congrio vs. jaiba) y curar fotos de prueba de antemano |
| Falla de conectividad durante el pitch | Video de respaldo grabado previamente |
| Automatizar navegador real (Playwright) contra SERNAPESCA consume demasiado tiempo | No hacerlo — mock explícito, se declara así en el pitch |
| Alcance demasiado ambicioso para 18h | Cortar P1/P2 sin culpa si a las 22h del bloque 4 no está listo; el flujo P0 solo ya cumple el 40% de IA |

---

## 11. Alineación con criterios de evaluación

| Criterio | Peso | Cómo lo cubre el MVP |
|---|---|---|
| Uso apropiado e innovador de IA | 40% | Visión + voz + extracción de entidades + matching, todos con rol funcional real en el flujo, no decorativo |
| Comprensión del desafío | 20% | Ataca trazabilidad + comercialización directa, ámbito explícito de las bases, con foco territorial justificado (Valparaíso) |
| Impacto potencial | 20% | Reduce merma, mejora ingresos, ataca causa de conflicto social, protege continuidad cultural |
| Calidad del pitch | 20% | Demo en vivo con flujo real + respaldo en video, narrativa clara problema→solución→impacto |

---

## 12. Roadmap post-hackathon (para mencionar en el pitch, no construir)

- Integración real con API/portal oficial de SERNAPESCA (vía convenio institucional, no scraping)
- Autenticación real vía clave única o convenio con registro de pescadores artesanales
- Modelo de visión fine-tuneado con dataset propio de especies de la región
- Sistema de pagos y logística de entrega integrados
- Panel de datos para SERNAPESCA/SUBPESCA con estadísticas agregadas de trazabilidad regional
