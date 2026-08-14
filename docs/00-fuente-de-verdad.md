# 00 · Fuente de verdad

Ocean Lab Hackathon 2026 · Desafío 1 (Economía Azul, Región de Valparaíso)
Equipo **LimacheWaves** · Producto **CaletaApp** · Mesa 2

**Deadline duro: viernes 14 de agosto, 10:00.** Pitch 10:00–11:30 (3 min + 2 min preguntas).

---

## Cómo se usa esta carpeta

`docs/` es la única fuente de verdad del proyecto. Si algo no está acá, no está decidido.

**Reglas:**

1. Antes de escribir código, lee el doc del área que vas a tocar.
2. Si cambias una decisión (stack, contrato de API, alcance), **actualiza el doc en el mismo commit**. Un contrato desactualizado es peor que no tenerlo.
3. Los contratos de `05-api-contratos.md` y los tipos de `src/lib/types.ts` son **el acuerdo entre frontend y backend**. Se cambian avisando al otro, no en silencio.
4. Datos con cifras: solo entran si tienen fuente citada en `01-contexto-problema.md`. Cifra sin fuente = riesgo en el pitch.
5. Si le pasas contexto a una IA (Kiro, Claude, Copilot), pásale el doc relevante — no expliques el proyecto de nuevo cada vez.

## Índice

| Doc | Para qué | Dueño |
|---|---|---|
| [01-contexto-problema.md](01-contexto-problema.md) | Problema, territorio, cifras **verificadas** y sus fuentes | Pía / Joaquín |
| [02-producto-alcance.md](02-producto-alcance.md) | Qué se construye y qué NO. Prioridades y criterios de aceptación | Todos |
| [03-arquitectura.md](03-arquitectura.md) | Stack, decisiones técnicas y por qué, deploy | Rubén / Manuel |
| [04-modelo-datos.md](04-modelo-datos.md) | Esquema de datos y seed | Manuel |
| [05-api-contratos.md](05-api-contratos.md) | Endpoints, payloads, errores | Manuel |
| [06-ia-y-prompts.md](06-ia-y-prompts.md) | Los 3 usos de IA, prompts exactos, fallbacks | Manuel |
| [07-diseno-ui.md](07-diseno-ui.md) | Paleta, tokens, pantallas, componentes | Rubén |
| [08-convenciones-git.md](08-convenciones-git.md) | Ramas, commits, cómo no pisarse trabajando en paralelo | Rubén / Manuel |
| [09-plan-noche.md](09-plan-noche.md) | Cronograma hora a hora hasta las 10:00 + reparto | Rubén / Manuel |
| [10-tareas-trello.md](10-tareas-trello.md) | Backlog listo para copiar a Trello | Rubén / Manuel |
| [11-riesgos-y-demo.md](11-riesgos-y-demo.md) | Riesgos, plan B, checklist de demo y pitch | Todos |

## Equipo

| Persona | Rol | Responsabilidad esta noche |
|---|---|---|
| **Joaquín** | Comercial | Presenta el pitch. Valida narrativa e impacto |
| **Pía** | Socióloga | Validación del problema, entrevistas, fuentes |
| **Rubén** | Dev | Frontend, diseño, formulario SERNAPESCA, marketplace UI |
| **Manuel** | Dev | Backend, IA (visión/voz/RAG), datos, precio dinámico |

> Nota: el guion del pitch cierra nombrando a *Joaquín, Maykol, Manuel, Pía y Matías* (5 personas).
> Alinear los nombres del cierre con el equipo real antes de subir al escenario.

## Criterios de evaluación (bases oficiales)

| Criterio | Peso | Dónde lo atacamos |
|---|---|---|
| Uso apropiado e innovador de IA | **40%** | 3 usos funcionales, no decorativos → `06-ia-y-prompts.md` |
| Comprensión del desafío | 20% | Cifras verificadas + foco territorial → `01-contexto-problema.md` |
| Impacto potencial | 20% | Merma evitada, ruta de continuidad → `01` y `11` |
| Calidad del pitch | 20% | Demo en vivo + URL/QR + video de respaldo → `11-riesgos-y-demo.md` |

El 40% se gana **explicando qué le pedimos a cada modelo y qué decidimos nosotros**, no por cantidad de features.
