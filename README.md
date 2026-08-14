# CaletaApp

Trazabilidad y venta directa para la pesca artesanal de la Región de Valparaíso.
Prototipo desarrollado en la **Ocean Lab Hackathon 2026** · Desafío 1: Economía Azul ·
equipo **LimacheWaves**.

> El pescador registra su captura por foto o voz, la IA identifica especie y peso, se
> autocompleta la trazabilidad de SERNAPESCA y el producto se publica en un marketplace
> donde **el precio baja automáticamente antes de que la pesca se convierta en merma**.

## Puesta en marcha

```powershell
npm install
copy .env.example .env.local     # rellenar GEMINI_API_KEY y DATABASE_URL
npx prisma db push               # crea las tablas
npm run seed                     # datos de Caleta Portales
npm run dev                      # http://localhost:3000
```

Las 2 claves:

| Variable | Dónde se saca |
|---|---|
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey (free tier) |
| `DATABASE_URL` | https://neon.tech → proyecto nuevo → connection string |

## Rutas

| Ruta | Qué es |
|---|---|
| `/` | Landing con los 3 accesos |
| `/pescador/captura` | Registro por foto, voz o manual |
| `/pescador/formulario/[id]` | Trazabilidad autocompletada |
| `/marketplace` | Productos con precio dinámico |
| `/restaurante` | Compra directa (P1) |

## Documentación

**`docs/` es la fuente de verdad.** Empieza por [`docs/00-fuente-de-verdad.md`](docs/00-fuente-de-verdad.md).

- Qué se construye y qué no → [`docs/02-producto-alcance.md`](docs/02-producto-alcance.md)
- Stack y por qué → [`docs/03-arquitectura.md`](docs/03-arquitectura.md)
- Contratos de API → [`docs/05-api-contratos.md`](docs/05-api-contratos.md)
- IA y prompts → [`docs/06-ia-y-prompts.md`](docs/06-ia-y-prompts.md)
- Plan de la noche → [`docs/09-plan-noche.md`](docs/09-plan-noche.md)
- Tareas para Trello → [`docs/10-tareas-trello.md`](docs/10-tareas-trello.md)

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Prisma + Postgres (Neon) ·
Google Gemini (visión, audio y texto) · deploy en Vercel.

## Transparencia

Este es un prototipo de hackathon. Está simulado y rotulado como tal en la propia interfaz:

- El envío del formulario a SERNAPESCA (**no** hay integración real).
- Las señales de clima, temporada turística y oferta regional que alimentan el RAG de precios
  (estructura real, valores simulados).
- La sesión del pescador (sin credenciales reales).
