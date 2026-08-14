<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# CaletaApp — contexto para agentes

Prototipo de la **Ocean Lab Hackathon 2026** (Desafío 1: Economía Azul, Región de Valparaíso).
Equipo LimacheWaves. **Deadline: viernes 14 de agosto, 10:00** — pitch de 3 minutos.

## Qué es

Trazabilidad + venta directa para pesca artesanal. El pescador registra su captura por
**foto o voz**, la IA extrae especie y peso, se autocompleta el formulario de trazabilidad
de SERNAPESCA (mock explícito), y la captura se publica en un marketplace donde el
**precio baja automáticamente si no se vende**, antes de convertirse en merma.

## Antes de escribir código, lee el doc correspondiente

`docs/` es la fuente de verdad del proyecto:

| Si vas a tocar... | Lee |
|---|---|
| cualquier cosa | `docs/00-fuente-de-verdad.md` |
| alcance, prioridades | `docs/02-producto-alcance.md` |
| stack, decisiones | `docs/03-arquitectura.md` |
| endpoints, payloads | `docs/05-api-contratos.md` |
| prompts, IA, RAG | `docs/06-ia-y-prompts.md` |
| UI, colores, pantallas | `docs/07-diseno-ui.md` |
| ramas, reparto de archivos | `docs/08-convenciones-git.md` |

## Reglas duras

1. **No romper el contrato.** `src/lib/types.ts` es el acuerdo entre frontend y backend.
   Si cambia, actualizar `docs/05-api-contratos.md` en el mismo commit.
2. **Toda respuesta de API** usa la envoltura `{ok, data}` / `{ok, error}` de `src/lib/types.ts`.
3. **La IA nunca cuelga la pantalla.** Timeout 12 s → error tipado → fallback manual.
4. **El precio dinámico tiene fallback determinista** en `src/lib/pricing.ts` (función pura,
   sin red). La capa RAG solo ajusta ±15% y explica. No mover esa arquitectura.
5. **Nada de `any`.** Nada de secretos fuera de `process.env`.
6. **Lo simulado se rotula en la UI** (`<BadgeSimulado />`). Es criterio de evaluación.
7. Todo el texto de interfaz va en **español de Chile**.
8. Catálogo de especies de la región de Valparaíso: **congrio, jaiba, jibia, corvina,
   reineta, merluza, lenguado, jurel, caballa, loco, erizo, pulpo, albacora**. Plus opción
   "otra" con texto libre (baja confianza) para especies no listadas. Fuente: `src/lib/types.ts` (ESPECIES).

## Fuera de alcance — no proponerlo

Integración real con SERNAPESCA, automatización de navegador contra su portal, pagos,
logística, autenticación real, backend en Python, vector DB, entrenar modelos propios.
Todas fueron decisiones evaluadas y descartadas para el hackathon: ver `docs/06-ia-y-prompts.md`.
Próximos pasos post-hackathon documentados en `docs/12-roadmap.md`.

## Cifras: no inventar

Solo usar cifras de la tabla de verificadas en `docs/01-contexto-problema.md`.
Ejemplo: son **1.033 embarcaciones** y **6.010 pescadores** en 36 caletas de la región
(Boletín Sectorial SERNAPESCA Valparaíso 4T2025), no las cifras del guion original del pitch.
