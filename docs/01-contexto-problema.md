# 01 · Contexto y problema

## El problema (una frase)

El pescador artesanal de las caletas de Valparaíso pierde ingreso por dos vías simultáneas:
**merma** (lo que no vende a tiempo se pierde) y **papeleo** (la trazabilidad obligatoria le
resta horas de mar). No tiene canal de venta directo ni forma rápida de cumplir.

## Cadena causal que atacamos

```
Sin canal directo  ─┐
Precio fijo         ├─▶  no vende a tiempo  ─▶  MERMA  ─▶  menos ingreso
Sobreoferta puntual ─┘                                        │
                                                              │
Trazabilidad manual ─▶ horas de papeleo ─▶ menos horas de mar ┘
```

Nuestra palanca: **anticipar la merma bajando el precio antes de que el producto se pierda**,
y **eliminar el papeleo** autocompletando el formulario con IA.

---

## Cifras VERIFICADAS (usar libremente, con fuente)

Todas salen de `contexto/05-datos/boletin_sectorial_region_de_valparaiso_-_4to_trimestre_2025.pdf`
(Boletín Sectorial SERNAPESCA, Región de Valparaíso, 4º trimestre 2025).

| Dato | Cifra | Uso en el pitch |
|---|---|---|
| Registro Pesquero Artesanal (RPA) regional | **6.010 personas** | Tamaño del universo afectado |
| Embarcaciones artesanales | **1.033** | Idem |
| Caletas o localidades con actividad pesquera | **36** | Escalabilidad regional del piloto |
| Nuevas inscripciones RPA 2025 | 503 personas, 16 embarcaciones | El sector sigue entrando, no muriendo |
| NEPPEX tramitadas 2025 | 5.146 (vs 6.340 en 2024, **−19%**) | Contracción de la actividad |
| Volumen exportado 2025 | 150.639 t (vs 189.954 t, **−21%**) | Idem |
| Causa atribuida por SERNAPESCA | bajas capturas de **jibia**, principal recurso regional | El recurso ya está estresado |
| Tramitación de exportaciones 2025 | 52% web / **48% manual** | **Argumento directo:** casi la mitad del papeleo del sector sigue siendo manual |
| Programa "Caleta +cerca" | +400 actividades en 2025, cubre las 36 caletas | Canal real de adopción/difusión ya existente |

### Dato fuerte que HOY NO está en el pitch y conviene agregar

> Desde el **1 de enero de 2026**, Estados Unidos exige **certificado de admisibilidad** para
> toda exportación de recursos pesqueros chilenos —artesanal e industrial, incluida la
> reexportación vía terceros países.
> *(Fuente: mismo boletín 4T2025, sección Exportaciones)*

Por qué importa: convierte la trazabilidad de "trámite molesto" en **requisito de acceso a
mercado con fecha vigente**. Es el argumento más difícil de refutar por el jurado y es de este
año. Sugerido para el bloque de problema o de impacto del pitch.

---

## Cifras NO VERIFICADAS (⚠️ no citar como dato duro)

| Afirmación en el pitch actual | Estado | Qué hacer |
|---|---|---|
| "casi **1.200 embarcaciones** y 6.000 pescadores" | ❌ **Incorrecto** | El boletín 4T2025 dice **1.033 embarcaciones** y 6.010 personas. Corregir a 1.033 — si el jurado revisa la fuente, 1.200 es refutable |
| "la pesca industrial se queda con **~94%** de las cuotas, 6% artesanal" | ⚠️ Sin fuente en nuestros archivos | El fraccionamiento varía **por pesquería**, no es un número nacional único. Los `.xlsx` de cuotas 2026 en `contexto/05-datos/` tienen el fraccionamiento real por pesquería: **verificar uno concreto y citar ese**, o decir "cifras que cruzamos de fuentes públicas del sector" |
| "merluza común: 13 años sobreexplotada, cuota 2026 baja 15%" | ⚠️ Sin respaldo en nuestros archivos | Solo tenemos cuotas de merluza **de cola**, anchoveta/sardina común y langostino amarillo. O se verifica en SUBPESCA, o se cambia el ejemplo a un recurso que sí tengamos documentado |
| "3ª región con más caletas de Chile" | ⚠️ Sin fuente | Tenemos el dato sólido de **36 caletas en la región**. Usar ese en vez del ranking |

**Regla para Joaquín:** una cifra refutada en vivo cuesta más que una cifra menos impactante.
Si no está en la tabla de verificadas, se dice en cualitativo.

---

## Territorio (restricción obligatoria de las bases)

Las bases exigen justificar **por qué la solución es propia de la Región de Valparaíso**.
Nuestro anclaje: **Caleta Portales**, con 36 caletas como ruta de escalamiento regional.

Justificación: la región concentra 6.010 pescadores en 36 caletas, tiene los dos puertos
principales del país (Valparaíso y San Antonio, por donde se tramitó el 94% del volumen
exportado regional), y una demanda turística/gastronómica local que hoy no compra directo
a la caleta. La combinación caleta + puerto + turismo es específica de este territorio.

## Actores y qué gana cada uno

| Actor | Gana |
|---|---|
| Pescador artesanal | Menos merma, precio que reacciona a tiempo, menos papeleo |
| Restaurante / hotel | Producto fresco trazable, proveedor certificado, pedidos automatizados |
| SERNAPESCA | Trazabilidad más consistente y digital (hoy 48% manual) |
| Región | Valor que se queda en la caleta en vez de diluirse en intermediarios |

## Ruta de continuidad (para el 20% de impacto)

Piloto con **Valpoemprende** o **CITA** (ambos organizadores de la hackathon) junto a una
cooperativa real de Caleta Portales, usando el programa **Caleta +cerca** de SERNAPESCA como
canal de llegada. Para pasar del mock al envío real: convenio de integración con SERNAPESCA.
