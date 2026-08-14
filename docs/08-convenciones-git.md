# 08 · Convenciones y cómo no pisarse

Dos personas, un repo, diez horas y sueño. Las reglas de abajo existen para que ningún
merge conflict nos cueste 40 minutos a las 4 AM.

## Reparto de archivos (la regla más importante)

| Zona | Dueño | El otro no la toca sin avisar |
|---|---|---|
| `src/app/api/**` | **Manuel** | ✋ |
| `src/lib/ai/**` | **Manuel** | ✋ |
| `src/lib/pricing.ts` | **Manuel** | ✋ |
| `prisma/**` | **Manuel** | ✋ |
| `src/data/knowledge/**` | **Manuel** | ✋ |
| `src/app/**/page.tsx` | **Rubén** | ✋ |
| `src/components/**` | **Rubén** | ✋ |
| `src/app/globals.css` | **Rubén** | ✋ |
| `src/lib/types.ts` | **compartido** | ⚠️ avisar por WhatsApp antes de cambiar |
| `src/lib/mocks.ts` | **compartido** | ⚠️ idem |
| `docs/**` | quien toma la decisión | actualizar en el mismo commit del cambio |

Si necesitas un archivo del otro: pídelo por mensaje, no lo edites en paralelo.

## Ramas

Hackathon = velocidad, pero no caos:

```
main            ← siempre desplegable. Es lo que ve el jurado.
feat/ia-vision      (Manuel)
feat/ia-voz         (Manuel)
feat/precio-rag     (Manuel)
feat/ui-captura     (Rubén)
feat/ui-formulario  (Rubén)
feat/ui-marketplace (Rubén)
```

- Merge a `main` **sin PR** (no hay tiempo), pero **solo si `npm run build` pasa**.
- Antes de mergear: `git pull --rebase origin main`.
- Commit chico y frecuente. Un commit que toca 15 archivos no se puede revertir a las 5 AM.
- **Nunca** `git push --force` a `main`.

## Commits

`tipo: descripción corta en español`

```
feat: endpoint de reconocimiento por foto
fix: peso en null cuando el audio no menciona kilos
docs: contrato de precio actualizado a ±15%
chore: seed con productos de 2, 8 y 20 horas
```

## Reglas de código

- **TypeScript sin `any`.** Los tipos de `src/lib/types.ts` son el contrato; romperlos silenciosamente es lo que produce bugs invisibles a las 4 AM.
- Toda respuesta de API usa la envoltura `{ok, data}` / `{ok, error}` de `05-api-contratos.md`.
- Nada de secretos en el código. Todo por `process.env`, y `.env.local` **nunca** se commitea.
- Los archivos de IA no se llaman desde componentes cliente: siempre vía route handler (la key es server-side).
- Antes de cada merge a `main`: `npm run build`. Sin excepciones — un `main` roto a las 9 AM es el peor escenario posible.

## Cadencia de sincronización

Cada **90 minutos**, 5 minutos de sync por voz:

1. ¿Qué está mergeado en `main`?
2. ¿Algo bloqueado?
3. ¿Seguimos con el alcance o cortamos algo de P1?

A las **04:30 se congela el alcance**: de ahí en adelante solo bugs, datos de demo y deploy.
Nada nuevo entra después de esa hora, aunque parezca rápido.

## Trabajar con IA (Kiro / Claude / Copilot)

- Pásale el doc del área, no el proyecto completo: `docs/05-api-contratos.md` para endpoints,
  `docs/06-ia-y-prompts.md` para IA, `docs/07-diseno-ui.md` para UI.
- `AGENTS.md` en la raíz ya tiene el resumen del proyecto: los agentes lo leen solos.
- Si la IA propone cambiar un contrato, primero avisar al otro dev. Un contrato cambiado
  en silencio es la forma más rápida de romper el trabajo del otro.
- Anotar en `docs/06-ia-y-prompts.md` toda decisión donde **corregimos** a la IA: eso es
  literalmente puntaje en la rúbrica (criterio del 40%).
