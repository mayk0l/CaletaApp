# CaletaApp — Spec de Implementación
**Ocean Lab Hackathon 2026 · LimacheWaves · 12 horas restantes**

## Stack
- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind → Vercel
- Backend: FastAPI (Python 3.14) + SQLite → Railway/Render
- IA runtime (todo $0): Gemini API (visión + LLM), INACAP API (deepseek-v3.2 / qwen3-32b)
- IA desarrollo: kiro-cli (opus 5 / gpt-5.6) — solo para escribir código complejo, no runtime
- Repo: monorepo /frontend + /backend
- DB: SQLite con volume mount en Railway

## Prioridades (reordenadas por Kike)
1. **P0-A**: Marketplace + precio dinámico + RAG (corazón del producto, reduce merma)
2. **P0-B**: Matching restaurantes/hoteles ↔ pescadores (conexión, problemática real)
3. **P0-C**: Formulario SERNAPESCA autollenado + validación + envío mock (trazabilidad)
4. **P0-D**: Registro de captura por voz + manual (entrada de datos)
5. **P1**: Reconocimiento visual de especie por foto (wow factor, si hay tiempo)

## Modelo de datos (SQLite)
```sql
CREATE TABLE pescador (
  id INTEGER PRIMARY KEY,
  nombre TEXT, caleta TEXT, region TEXT, registro_sernapesca TEXT
);

CREATE TABLE captura (
  id INTEGER PRIMARY KEY,
  pescador_id INTEGER, especie TEXT, peso_kg REAL, largo_cm REAL,
  metodo_registro TEXT, -- 'foto'|'voz'|'manual'
  foto_url TEXT, timestamp TEXT, estado TEXT -- 'pendiente'|'validada'|'enviada'
);

CREATE TABLE formulario_trazabilidad (
  id INTEGER PRIMARY KEY,
  captura_id INTEGER, campos_json TEXT, estado_envio TEXT
);

CREATE TABLE producto_marketplace (
  id INTEGER PRIMARY KEY,
  captura_id INTEGER, especie TEXT, cantidad INTEGER,
  precio_inicial REAL, precio_actual REAL,
  timestamp_publicacion TEXT, ultima_actualizacion TEXT,
  estado TEXT -- 'disponible'|'reservado'|'vendido'
);

CREATE TABLE senal_mercado (
  id INTEGER PRIMARY KEY,
  tipo TEXT, -- 'clima'|'temporada_turistica'|'disponibilidad_regional'
  valor TEXT, fecha TEXT, fuente TEXT
);

CREATE TABLE restaurante (
  id INTEGER PRIMARY KEY,
  nombre TEXT, sello_certificado INTEGER DEFAULT 1
);

CREATE TABLE pedido (
  id INTEGER PRIMARY KEY,
  restaurante_id INTEGER, especie_solicitada TEXT, cantidad INTEGER,
  estado TEXT -- 'cola'|'match'|'resuelto'
);
```

## Endpoints FastAPI
```
POST /api/capturas/voz          → transcribe + extrae entidades (Gemini)
POST /api/capturas/manual       → registro manual (fallback)
POST /api/capturas/imagen       → reconocimiento especie (Gemini visión, P1)

GET  /api/formulario/{cid}      → JSON formulario autocompletado
POST /api/formulario/{cid}/validar  → pescador confirma
POST /api/formulario/{cid}/enviar   → envío mock SERNAPESCA

POST /api/marketplace/publicar/{cid}  → publica tras validación
GET  /api/marketplace                 → lista productos + precio_actual
POST /api/marketplace/{pid}/actualizar-precio → recalcula con RAG
GET  /api/marketplace/{pid}/prediccion → tendencia + justificación

POST /api/pedidos                    → restaurante crea pedido
GET  /api/pedidos/match/{pid}        → matching por especie/cercanía/frescura
```

## IA — Asignación de modelos (todo runtime $0)
| Tarea | Modelo | Vía | Costo |
|-------|--------|-----|-------|
| Visión especie + peso | gemini-2.5-flash | Gemini API (APIKEY_1) | $0 |
| Transcripción voz → entidades | gemini-2.5-flash | Gemini API (APIKEY_2) | $0 |
| RAG precio dinámico + justificación | qwen3-32b | INACAP API | $0 |
| Matching | reglas + score | sin LLM | $0 |

## Precio dinámico (mecanismo central)
- **Regla base**: cada 2h sin venta, precio baja 5% escalonado (mínimo 60% del inicial)
- **Capa RAG**: señales simuladas (clima Valparaíso agosto, temporada turística, disponibilidad)
  ajustan velocidad de baja y generan justificación explicada
- **Output**: `{precio_sugerido, tendencia, justificacion_breve}`
- **Endpoint cron**: `/api/marketplace/actualizar-precios` (llamado periódico)

## Seeds (datos de demo)
- 3 pescadores de Caleta Portales
- 2 restaurantes + 1 hotel de Valparaíso
- 5 especies objetivo: congrio, merluza, jaiba, reineta, corvina
- Señales de mercado simuladas realistas (agosto 2026, Valparaíso)

## Deploy
- Frontend → Vercel (auto-deploy desde repo)
- Backend → Railway (volume mount para SQLite persistente)
- Video de respaldo grabado antes del pitch

## Orquestación JARVIS
- Claude (yo): arquitecto + backend + frontend + deploy
- Subagentes en paralelo para scaffolding y código mecánico
- kiro-cli (opus 5): solo para desarrollar lógica compleja (RAG, precio dinámico)
- Codex (gpt-5.6 luna): si está disponible, para debug profundo
- opencode (qwen3.7-max): worker para scaffolding y código repetitivo
