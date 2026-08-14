# 07 · Diseño y UI

## Paleta corporativa (de `contexto/04-diseno/`)

| Rol | Color | Hex | Token |
|---|---|---|---|
| Principal | Azul marino profundo | `#0F2C59` | `--color-marino` |
| Secundario 1 | Verde agua | `#00A884` | `--color-agua` |
| Secundario 2 | Cobre cálido | `#D97706` | `--color-cobre` |
| Secundario 3 | Crema salino | `#F8FAF2` | `--color-crema` |

Ya están definidos como tokens en `src/app/globals.css` y disponibles en Tailwind
como `bg-marino`, `text-agua`, `border-cobre`, `bg-crema`.

**Uso semántico (respetarlo, evita discusiones de color a las 3 AM):**

- `marino` → fondos de header, texto principal, elementos de autoridad/institucional
- `agua` → acciones primarias, éxito, estado "fresco / precio estable"
- `cobre` → alertas de merma, descuentos, tendencia bajista, urgencia
- `crema` → fondo general de la app
- Blanco → tarjetas sobre crema

El logo es una "C" con forma de anzuelo, en verde agua.

## Principios

1. **Mobile-first en todo lo del pescador.** Botones grandes: se usa con las manos mojadas y de pie.
2. **Un objetivo por pantalla.** El pescador que llega de faenar no explora menús.
3. **Lo simulado se rotula.** Badge `simulado` en gris, sin esconderlo. Es honestidad y da puntos.
4. **El precio bajando debe verse.** Es la imagen que tiene que quedar en la cabeza del jurado:
   precio tachado, precio nuevo en cobre, y la razón en una frase.
5. **Accesibilidad mínima real:** contraste AA sobre crema, labels en todos los inputs,
   estados de foco visibles, `aria-live` en los resultados de IA (el usuario debe saber que llegó
   una respuesta sin tener que mirar fijo).

## Pantallas

| Ruta | Qué muestra | Estado |
|---|---|---|
| `/` | Landing corta: problema en 1 frase + 3 accesos (Pescador / Marketplace / Restaurante) | Rubén |
| `/pescador` | Home: "Registrar captura" grande + últimas capturas | Rubén |
| `/pescador/captura` | 3 pestañas: **Foto** · **Voz** · **Manual**. Muestra resultado de IA con confianza | Rubén |
| `/pescador/formulario/[id]` | Formulario de trazabilidad autocompletado + advertencias + botón validar y enviar | Rubén |
| `/marketplace` | Grilla de productos con precio actual, descuento, horas publicado, tendencia y justificación | Rubén |
| `/restaurante` | Filtro por especie, crear pedido, ver match, sello certificado | Rubén (P1) |

## Componentes a construir (en `src/components/`)

| Componente | Uso |
|---|---|
| `AppHeader` | Header marino con logo y navegación entre los 3 roles |
| `BadgeSimulado` | El rótulo de honestidad, reutilizable |
| `ConfianzaIA` | Barra + porcentaje de confianza del modelo |
| `PrecioDinamico` | Precio tachado → precio actual + % descuento + tendencia |
| `TarjetaProducto` | Producto del marketplace |
| `CapturaTabs` | Selector foto / voz / manual |
| `GrabadorVoz` | Botón de grabación con `MediaRecorder`, envía webm |
| `SubidorFoto` | Input de cámara (`capture="environment"`) + preview |
| `CampoFormulario` | Input con label, ayuda y estado de advertencia |
| `EstadoVacio` | Placeholders mientras no hay datos |

## Detalle que vale la pena para el pitch

En el marketplace, mostrar junto a cada producto el **tiempo restante antes del próximo tramo
de descuento** ("baja a −25% en 3 h 40 min"). Es una línea de código sobre la función de pricing
y comunica visualmente que el sistema *anticipa* la merma en vez de reaccionar tarde — que es
exactamente la frase central del pitch.

## Pendiente de conseguir

⚠️ **El screenshot del formulario real de SERNAPESCA no está en `contexto/`.** El PRD lo menciona
como insumo disponible pero no se subió. Sin él, los campos de `/pescador/formulario/[id]` son
una aproximación razonable. Pedirlo a Pía/Joaquín, o buscar el formulario oficial de declaración
de desembarque artesanal. Impacta directo al criterio de comprensión del desafío: un formulario
que se parece al real es mucho más creíble en pantalla.
