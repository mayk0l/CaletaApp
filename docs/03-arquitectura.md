# 03 · Arquitectura

## Stack definitivo

| Capa | Elección | Versión |
|---|---|---|
| Framework | **Next.js (App Router)** — frontend **y** backend en el mismo proyecto | 16.3.1 |
| Lenguaje | TypeScript | 5 |
| UI | Tailwind CSS v4 (tokens de marca en `globals.css`) | 4 |
| Runtime | React | 19.2 |
| Base de datos | **Postgres serverless (Neon)** vía Prisma con `db push` | — |
| IA | **Google Gemini** (`@google/genai`): visión, audio y texto con **una sola API key** | `gemini-2.5-flash` |
| Embeddings (RAG) | Gemini `text-embedding-004` + similitud coseno en memoria | — |
| Deploy | **Vercel** (un solo deploy, un solo dominio) | — |
| Repo | GitHub `mayk0l/CaletaApp`, monorepo simple (una sola app) | — |

## Decisiones y por qué (esto es lo que hay que poder defender)

### 1. Sin FastAPI: todo en Next.js API routes

El PRD original proponía Next.js + FastAPI en Python. **Lo cambiamos.** Razones concretas:

- Dos runtimes = dos deploys, dos sets de variables de entorno, CORS y ~1 hora de plomería que no da puntos.
- Somos 2 devs y ~10 horas. Un solo `npm run dev` y un solo `vercel deploy` es menos superficie de error a las 4 AM.
- Las APIs de IA son llamadas HTTP: Python no aporta ventaja real acá. El SDK de Gemini para JS cubre visión, audio y texto.
- Un solo lenguaje permite compartir tipos entre frontend y backend (`src/lib/types.ts`), que es justo lo que nos deja trabajar en paralelo sin pisarnos.

*Si Manuel prefiere Python para la capa de IA, el costo es CORS + segundo deploy + duplicar tipos. Se puede, pero hay que decidirlo ahora, no a las 2 AM.*

### 2. Gemini como único proveedor de IA

Gemini procesa **imagen y audio nativamente** en el mismo modelo. Eso elimina la integración
separada de speech-to-text que el PRD daba por necesaria: una API key, un SDK, tres usos.
Tiene free tier en AI Studio, lo que importa a esta hora sin presupuesto.

La capa está detrás de `src/lib/ai/client.ts`. Cambiar a OpenAI = tocar un archivo.

### 3. Postgres en la nube, no SQLite

Vercel es serverless: el filesystem es efímero, un archivo SQLite **no persiste** entre
invocaciones. Como el precio dinámico depende de que la captura persista en el tiempo, la
demo se rompería justo en el feature central. Neon (Postgres serverless, free tier) resuelve
esto en ~5 minutos y sirve igual en local y en producción.

Ya dependemos de internet por la API de Gemini, así que el DB remoto no agrega un riesgo nuevo.
Usamos `prisma db push` en vez de migraciones: no hay ceremonia de migrations en un hackathon.

### 4. El precio dinámico tiene fallback determinista

`src/lib/pricing.ts` calcula el precio con una **función pura** basada en horas sin venderse.
No llama a la IA. La capa RAG solo **ajusta y explica** encima de eso.
Si Gemini se cae en medio del pitch, el feature central sigue funcionando y visible.
Esta decisión es deliberada y vale mencionarla al jurado.

### 5. Envío a SERNAPESCA simulado, y rotulado como tal

Se arma el payload real, se muestra estado de carga, se devuelve confirmación mock.
La UI lo rotula "simulado". Automatizar el portal real con un navegador headless fue
**evaluado y descartado** por riesgo/tiempo — es el ejemplo que Joaquín usa en el pitch
como "punto donde corregimos a la IA".

## Diagrama

```
┌────────────────────────────────────────────┐
│            Next.js (Vercel)                │
│                                            │
│  App Router (React 19, Tailwind v4)        │
│   /pescador/captura   /pescador/formulario  │
│   /marketplace        /restaurante          │
│                    │                        │
│                    ▼                        │
│  Route Handlers  /api/*                     │
│   capturas · formulario · marketplace       │
│   precio · pedidos                          │
│         │                    │              │
│         ▼                    ▼              │
│  src/lib/ai/*          src/lib/db.ts        │
│  vision · voice        (Prisma)             │
│  price-rag                                  │
└─────────┬──────────────────────┬───────────┘
          ▼                      ▼
   Gemini API              Neon Postgres
 (visión/audio/texto)
          ▲
          │
   src/data/knowledge/*.json   ← base de conocimiento del RAG
```

## Estructura de carpetas

```
caletaapp/
├─ docs/                     ← fuente de verdad (leer antes de codear)
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts                ← datos realistas de Caleta Portales
├─ public/
│  └─ demo/                  ← fotos curadas de especies para la demo
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx  page.tsx  globals.css
│  │  ├─ pescador/
│  │  │  ├─ page.tsx                 (home del pescador)
│  │  │  ├─ captura/page.tsx         (foto | voz | manual)
│  │  │  └─ formulario/[id]/page.tsx (trazabilidad autocompletada)
│  │  ├─ marketplace/page.tsx
│  │  ├─ restaurante/page.tsx
│  │  └─ api/
│  │     ├─ capturas/imagen/route.ts
│  │     ├─ capturas/voz/route.ts
│  │     ├─ capturas/manual/route.ts
│  │     ├─ formulario/[id]/route.ts
│  │     ├─ formulario/[id]/enviar/route.ts
│  │     ├─ marketplace/route.ts
│  │     ├─ marketplace/[id]/precio/route.ts
│  │     └─ pedidos/route.ts
│  ├─ components/            ← UI compartida (dueño: Rubén)
│  ├─ lib/
│  │  ├─ types.ts            ← CONTRATO compartido: no se cambia en silencio
│  │  ├─ mocks.ts            ← fixtures para trabajar sin backend listo
│  │  ├─ pricing.ts          ← regla determinista de precio
│  │  ├─ db.ts               ← cliente Prisma singleton
│  │  └─ ai/
│  │     ├─ client.ts        ← única puerta al proveedor de IA
│  │     ├─ vision.ts
│  │     ├─ voice.ts
│  │     └─ price-rag.ts
│  └─ data/
│     └─ knowledge/          ← documentos del RAG (señales de mercado)
└─ .env.example
```

## Variables de entorno

Ver `.env.example`. Mínimo para que corra:

```
GEMINI_API_KEY=...      # aistudio.google.com/apikey  (free tier)
DATABASE_URL=...        # neon.tech → proyecto nuevo → connection string
```

## Puesta en marcha

```powershell
npm install
copy .env.example .env.local     # y rellenar las 2 claves
npx prisma db push               # crea las tablas en Neon
npm run seed                     # carga Caleta Portales + especies + señales
npm run dev
```

## Deploy

```powershell
npx vercel            # primera vez: link del proyecto
npx vercel --prod
```
Las mismas 2 variables van en Vercel → Settings → Environment Variables.
**Deployear vacío al inicio de la noche**, no a las 6 AM: así el deploy nunca es la sorpresa final.
