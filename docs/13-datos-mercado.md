# 13 · Datos de mercado: qué está simulado y cómo se reemplaza con dato real

Estado: **14-08-2026**. Este doc existe porque el motor de precios ya funciona con
datos sintéticos y hay que poder decir con precisión **qué es simulado, por qué, y
qué habría que conseguir** para que sea real. Es la tarea de investigación que queda
pendiente después del hackathon.

Regla que se respeta en todo el código: cada documento del corpus viaja con
`simulada: true` y con el campo `fuenteReal` que nombra la fuente que lo
reemplazaría. La UI muestra el badge de dato simulado. **No se presenta un dato
sintético como si fuera real en ningún punto de la demo.**

---

## 1. Qué está simulado hoy

El simulador (`src/lib/market/simulador.ts`) genera una serie diaria por especie con
cuatro variables. Ninguna está escrita a mano: se construyen desde un modelo
generativo con semilla fija, así que la demo es reproducible.

| Variable | Qué representa | Cómo se genera hoy |
|---|---|---|
| `desembarqueKg` | Kg de la especie desembarcados en la caleta ese día | Nivel por perfil de especie, atenuado por clima y fin de semana, con ruido lognormal |
| `oleajeM` | Altura de ola, proxy de si se puede zarpar | Episodios de marejada persistentes (1-4 días) sobre un nivel base de 1.9 m |
| `indiceTurismo` | Presión de demanda turística, 0 a 1 | Coseno anual con máximo el 15 de enero (verano austral) más ruido |
| `precioMayoristaKg` | La variable a predecir | Log-lineal en los tres anteriores + fin de semana + shock AR(1) |

El precio **no se sortea**: se construye desde los regresores. Por eso la relación
oferta/clima/demanda → precio existe de verdad en el dato y el estimador tiene algo
real que encontrar, en vez de ajustar ruido.

---

## 2. Fuentes reales a conseguir

### 2.1 Desembarque artesanal — la variable más importante

Es el regresor con más peso del modelo (elasticidad estimada entre −0.25 y −0.60
según especie), así que es la primera que hay que reemplazar.

- **SERNAPESCA** publica desembarque artesanal por región, caleta, especie y mes en
  sus anuarios y en la sección de estadísticas. Formato: planillas XLSX por año.
- **Fricción esperada:** la granularidad pública es **mensual y regional**, y el
  modelo necesita **diaria y por caleta**. Es el hueco más grande entre lo que hay
  publicado y lo que el producto necesita.
- **Caminos posibles:**
  1. Pedir acceso a los registros de la bitácora de desembarque por vía formal
     (Ley de Transparencia) para obtener el dato diario.
  2. Convenio directo con el sindicato de la caleta: el registro de desembarque
     diario existe a nivel local aunque no se publique.
  3. Mientras no haya dato diario: desagregar el mensual con un modelo de reparto
     usando clima diario como distribuidor, y ser explícito de que es una
     imputación, no una medición.
- **IFOP** complementa con informes de estado de stock por especie, útiles para el
  nivel de mediano plazo (no para el día a día).

### 2.2 Estado del mar y pronóstico

- **Directemar / SHOA** publican avisos de marejadas y pronóstico costero. El aviso
  de marejadas es justamente el evento que corta la oferta.
- **Alternativa con API abierta:** modelos de olas globales tipo Copernicus Marine
  o servicios meteorológicos con endpoint de `wave_height` por coordenada. Cubren la
  bahía de Valparaíso con resolución suficiente y evitan depender de scraping.
- Es la fuente **más fácil de conseguir de las cuatro** y la que además da el
  pronóstico a futuro que el forecast necesita.

### 2.3 Precio mayorista de referencia

- **ODEPA** publica precios mayoristas de productos del mar. Cobertura irregular
  para especies de pesca artesanal costera.
- **Terminal Pesquero Metropolitano** y ferias regionales manejan precios diarios;
  habría que ver si existe publicación sistemática o si requiere convenio.
- **Fricción:** el precio en playa (lo que recibe el pescador) **no es** el precio
  mayorista de Santiago. La diferencia es justamente el problema que el producto
  quiere atacar, así que conviene registrar los dos y modelar el margen.

### 2.4 Demanda turística

- **SERNATUR / INE** publican pernoctaciones y ocupación hotelera regional, con
  rezago de semanas y frecuencia mensual.
- Para frecuencia diaria: calendario de feriados y fines de semana largos (dato
  duro y gratis), y eventos grandes de la ciudad. Con eso solo ya se captura buena
  parte de la variación de corto plazo.

---

## 3. Cómo migrar sin reescribir el motor

El motor no sabe de dónde vienen los datos: consume `ObservacionMercado[]`. Migrar es
sustituir el productor, no el modelo.

```
                   ┌── simulador.ts        (hoy, sintético)
ObservacionMercado ─┤
                   └── adaptadores reales  (después: SERNAPESCA, Directemar, ODEPA)
                            │
                            ▼
                   forecast.ts (regresión) → corpus.ts (RAG) → price-rag.ts (LLM)
```

Pasos concretos:

1. Definir `FuenteMercado` como interfaz con un método
   `obtenerSerie(especie, dias): Promise<ObservacionMercado[]>`.
2. Implementar un adaptador por fuente, con caché en la tabla `SenalMercado` que ya
   existe en el schema de Prisma.
3. Dejar el simulador como implementación de respaldo. Sigue siendo útil: es lo que
   permite validar el estimador contra coeficientes conocidos, y sostiene la demo
   cuando una fuente externa se cae.
4. `simulada: true` pasa a calcularse por documento según su origen real, no fijo.

---

## 4. Recalibración cuando haya dato real

Los parámetros de `PERFILES` en `simulador.ts` (elasticidad de oferta, sensibilidad
al oleaje y al turismo por grupo de especies) son **supuestos nuestros**, agrupados
en tres perfiles: alto valor, volumen y marisco. Son hipótesis falsables, y con dato
real dejan de ser supuestos: se estiman con la misma regresión de `forecast.ts`
aplicada a la serie observada, y los perfiles se reemplazan por coeficientes por
especie.

Qué revisar en ese momento:

- **Elasticidades por especie** en vez de por grupo, si hay suficientes
  observaciones (con ~120 días por especie ya alcanza).
- **Persistencia AR(1)**: hoy se estima del dato y da alrededor de 0.5. Con dato real
  puede ser bastante mayor, y eso cambia cuánto conviene esperar antes de bajar el
  precio.
- **Reintroducir la tendencia**, pero identificada con más de un año de serie. Se
  sacó a propósito: con 120 días queda colineal con la estacionalidad anual y la
  extrapolación se dispara (ver `docs/06-ia-y-prompts.md`).
- **Términos que hoy no existen**: precio de sustitutos (si la reineta está barata,
  presiona al congrio), efecto de vedas y tallas mínimas, y combustible.

---

## 5. Cómo se valida que el modelo sirve

`npm run verificar:mercado` corre cinco bloques de comprobaciones que pueden fallar
de verdad. Con dato real, los tres primeros siguen valiendo igual; el segundo hay que
cambiarlo por validación cruzada, porque ya no habrá coeficientes verdaderos que
recuperar.

| Comprobación | Qué prueba | Resultado con dato sintético |
|---|---|---|
| Determinismo | Misma semilla, misma serie | OK |
| Recuperación de coeficientes | La regresión aproxima los coeficientes verdaderos, que no conoce | error medio 0.02 en la elasticidad de oferta |
| Backtest vs ingenuo | Le gana a "mañana vale lo que vale hoy" | 13/13 especies; MAPE 3.7-7.1% vs 9.4-20.0% |
| Calibración de banda | La banda del 80% cubre ~80% | 76.1% promedio |
| Exactitud de la descomposición | Los factores reconstruyen la variación total | 0 inconsistencias |

El backtest contra la predicción ingenua es el criterio que importa: en series de
precios, "mañana vale lo que vale hoy" es un rival difícil, y un modelo que no le
gana no aporta nada aunque tenga buen R².
