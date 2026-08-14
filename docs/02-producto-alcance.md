# 02 · Producto y alcance

## Flujo único que hay que demostrar

```
1. Pescador llega de faenar
2. Registra la captura: FOTO o VOZ
3. IA extrae especie + peso/talla estimados
4. App autocompleta el formulario de trazabilidad (SERNAPESCA)
5. Pescador valida y "envía"        → confirmación (MOCK explícito)
6. La captura se publica sola en el marketplace
7. Si no se vende, el precio BAJA automáticamente antes de que sea merma
8. Restaurante ve el producto con precio actual y pide
```

Todo el pitch cuelga de este flujo. Si algo no aporta a estos 8 pasos, no se construye hoy.

## Alcance priorizado

Cada feature tiene un criterio de aceptación **demostrable en pantalla**. Si no se puede mostrar
en 3 minutos, no cuenta.

### P0 — sin esto no hay demo

| # | Feature | Criterio de aceptación | Dueño |
|---|---|---|---|
| 1 | **Precio dinámico decreciente** | Un producto publicado hace N horas muestra precio menor al inicial, con el descuento visible y explicado. Debe funcionar **aunque la IA falle** (regla determinista de respaldo) | Manuel |
| 2 | **Predicción de precio con RAG** | Devuelve `{precio_sugerido, tendencia, justificación}` citando la señal que usó (clima / temporada / oferta) | Manuel |
| 3 | **Visión: especie + peso por foto** | Con ≥2 especies distinguibles, subir foto devuelve especie, confianza y peso estimado en <10 s | Manuel |
| 4 | **Voz: registro hablado** | "traje dos congrios de tres kilos cada uno" → `{especie: congrio, cantidad: 2, peso_unitario_kg: 3}` | Manuel |
| 5 | **Formulario trazabilidad autocompletado** | El formulario aparece con los campos ya llenos desde la captura; el pescador solo valida | Rubén |
| 6 | **Envío mock + publicación automática** | Validar dispara confirmación de envío y el producto aparece en el marketplace sin pasos extra | Rubén |
| 7 | **Marketplace** | Lista productos con precio actual, tiempo desde captura y badge de tendencia | Rubén |

### P1 — si el reloj alcanza

| # | Feature | Criterio de aceptación | Dueño |
|---|---|---|---|
| 8 | Vista restaurante + pedido | Restaurante filtra por especie, crea pedido, ve estado | Rubén |
| 9 | Matching pedido → captura | Ordena candidatos por especie, frescura y cantidad, con score visible | Manuel |
| 10 | Sello "Pesca Artesanal Certificada" | Badge visible en producto y en perfil de restaurante | Rubén |
| 11 | Login mock de pescador | Selector de pescador, sin credenciales reales | Rubén |

### P2 — solo si sobra tiempo (probablemente no)

| # | Feature |
|---|---|
| 12 | Historial de capturas con export |
| 13 | Panel agregado tipo SERNAPESCA |

### Fuera de alcance — decisión tomada, no reabrir

- Integración real con SERNAPESCA (**mock explícito**, se declara en el pitch)
- Automatizar un navegador real contra el sitio de SERNAPESCA (descartado: alto riesgo, cero puntos extra de IA)
- Pagos, logística, autenticación real, multi-tenant, tests exhaustivos
- Entrenar un modelo propio de visión
- App móvil nativa (es web responsive, se demuestra en móvil)

## Decisiones de producto ya cerradas

1. **Mobile-first.** El pescador usa el teléfono en la caleta. El marketplace del restaurante puede ser desktop.
2. **La merma es el corazón**, no un efecto secundario. El precio dinámico se muestra antes que cualquier otra feature.
3. **Honestidad sobre los mocks.** Todo lo simulado se rotula en la propia UI (badge "simulado"). La rúbrica premia decir qué falta; esconderlo se castiga si el jurado pregunta.
4. **2 o 3 especies, no más.** Precisión de visión > catálogo amplio. Elegir especies visualmente muy distintas (ej. congrio vs. jaiba vs. jibia).
5. **Datos de contexto simulados con estructura real** (clima, temporada). Se declara en la UI y en el pitch.

## Especies del demo

Elegir 3 con apariencia claramente distinta y presencia real en la región:

| Especie | Por qué | Precio referencia (definir en seed) |
|---|---|---|
| Congrio | Alargado, inconfundible | $/kg |
| Jaiba | Crustáceo, forma totalmente distinta | $/kg |
| Jibia | Principal recurso regional según el boletín 4T2025 → conecta con el dato duro | $/kg |

Curar 2–3 fotos de prueba por especie **antes** de la demo y guardarlas en `public/demo/`.
