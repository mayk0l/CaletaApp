# Contexto — fuentes del proyecto

Documentación de referencia de la hackathon. **No es la fuente de verdad del desarrollo**:
esa es [`../docs/`](../docs/). Acá viven los insumos originales de los que salieron esos docs.

| Carpeta | Contenido |
|---|---|
| `01-bases-hackaton/` | Bases oficiales Ocean Lab Hackathon 2026 |
| `02-pitch/` | Guion del pitch — **no versionado**, ver nota abajo |
| `03-producto/` | PRD técnico inicial |
| `04-diseno/` | Paleta de colores corporativa |
| `05-datos/` | Boletines sectoriales SERNAPESCA Valparaíso + cuotas 2026 (fuentes públicas) |
| `06-tecnico/` | (vacío) |
| `99-misc/` | (vacío) |

## Nota sobre `02-pitch/`

Está en `.gitignore`: **este repositorio es público** y el guion contiene notas internas de
estrategia frente a la rúbrica del jurado. Existe en disco pero no se versiona.

## Cifras: cuidado

Las cifras del guion del pitch **no coinciden** con los boletines de `05-datos/`.
La tabla de qué está verificado y qué no está en
[`../docs/01-contexto-problema.md`](../docs/01-contexto-problema.md). Usar esa, no el guion.

## Trazabilidad de las fuentes

| Dato usado en el proyecto | Archivo |
|---|---|
| 6.010 pescadores, 1.033 embarcaciones, 36 caletas | `05-datos/boletin_..._4to_trimestre_2025.pdf` |
| Caída de 19% en NEPPEX y 21% en volumen exportado 2025 | idem |
| 48% de exportaciones aún tramitadas de forma manual | idem |
| Certificado de admisibilidad EE.UU. desde 1-ene-2026 | idem |
| Fraccionamiento de cuotas por pesquería 2026 | `05-datos/*.xlsx` (sin revisar aún) |
| Paleta corporativa | `04-diseno/` |
