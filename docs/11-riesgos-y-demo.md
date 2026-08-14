# 11 · Riesgos y checklist de demo

## Riesgos y mitigación

| Riesgo | Probabilidad | Mitigación | ¿Ya cubierto? |
|---|---|---|---|
| Wifi del venue falla durante el pitch | Alta | Video de respaldo local + capturas de pantalla | Tarea en Trello |
| API de Gemini caída o con rate limit | Media | Precio dinámico tiene fallback determinista sin IA. Capturas de resultados reales guardadas | Por diseño |
| La visión no reconoce bien las especies | Media | Catálogo cerrado a 3 especies muy distintas + fotos curadas probadas de antemano | Por diseño |
| No alcanza el tiempo | **Alta** | Reglas de corte por hora en `09-plan-noche.md`. P1 es sacrificable sin culpa | Documentado |
| Deploy falla a última hora | Media | Deploy vacío al inicio de la noche, no al final | Tarea en Trello |
| Rate limit del free tier de Gemini en pleno pitch | Media | No hacer pruebas masivas después de las 09:00. Tener resultados cacheados en el seed | ⚠️ Recordarlo |
| Merge conflict caro | Media | Reparto estricto de archivos en `08-convenciones-git.md` | Documentado |
| Jurado repregunta una cifra y se cae | Media | Tabla de cifras verificadas vs. no verificadas en `01-contexto-problema.md` | Documentado |
| Nos dormimos y no hay ensayo | Media | Dos alarmas distintas a las 08:30, en dos teléfonos | ⚠️ Ponerlas ahora |

## Plan B por feature

| Si falla... | Se muestra |
|---|---|
| Visión | Registro por voz, y la foto queda como mockup con resultado precargado |
| Voz | Registro por foto o manual |
| RAG de precio | Precio por regla base con badge "ajustado por regla base" |
| Todo el backend | Video de respaldo |
| Internet completo | Video de respaldo local + capturas impresas en la lámina |

## Checklist pre-pitch (09:30, sin excepciones)

- [ ] URL de producción carga en el celular de Joaquín, con datos de demo visibles
- [ ] QR generado, probado y pegado en la lámina
- [ ] Marketplace muestra los 3 tramos de descuento (2 h, 8 h, 20 h)
- [ ] Una foto de prueba pasa por visión correctamente **en producción**, no en local
- [ ] Un audio de prueba pasa por voz correctamente **en producción**
- [ ] Video de respaldo reproduce sin internet
- [ ] Joaquín tiene a mano la tabla de cifras verificadas
- [ ] Joaquín puede responder "¿qué le pidieron a la IA y qué decidieron ustedes?" de memoria
- [ ] Notebook cargado + cargador + celular cargado
- [ ] Pantalla en modo claro, brillo alto, notificaciones silenciadas
- [ ] Zoom del navegador al 110-125% (el jurado mira desde lejos)

## Guion de la demo en vivo (60 segundos, ensayarlo)

1. Abrir `/pescador/captura` en el celular → subir foto de congrio
2. Señalar el resultado: **especie + peso + confianza del modelo**
3. Pasar al formulario ya lleno → señalar el badge `simulado` y decirlo en voz alta
4. Validar y enviar → aparece el folio
5. Cambiar a `/marketplace` → el producto ya está publicado
6. Señalar los productos de 8 h y 20 h: **precio tachado, precio nuevo, y la razón**
7. Cerrar con: *"esto es merma que no ocurrió"*

Ese paso 6 es el que gana el pitch. Que se vea grande y que Joaquín se detenga ahí 5 segundos.

## Lo que hay que decir con honestidad (la rúbrica lo premia)

- El envío a SERNAPESCA es un **mock**. Se dice, no se esconde.
- Las señales de clima y temporada son **simuladas con estructura real**.
- El matching **no usa un LLM**, y esa fue una decisión: para 3 especies no aporta.
- Lo que falta: convenio con SERNAPESCA, dataset propio de especies, pagos y logística.
