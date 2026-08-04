# Notas de trazabilidad del dataset canónico PEI 2026–2030

## Fuentes y precedencia

El dataset (`objetivos.json`, `acciones.json`, `indicadores.json`, `riesgos.json`)
consolida tres fuentes con esta precedencia (la más alta gana en conflicto):

1. **Auditoría de cruce resumen vs fichas técnicas** (`auditoria_cruce_resumen_vs_fichas.csv`)
   — los valores de las fichas técnicas oficiales (verif. 09.03) son la fuente de verdad
   del bloque técnico.
2. **Matriz "Formulación Estratégica Integrada" del PEI 2026-2030 publicado** (PDF oficial,
   pp. 24–39) — metas anuales 2026–2030 completas de los 89 indicadores, incluidos los
   6 de nivel OE y las metas 2027–2030 de OE4/OE5/OE6 ausentes en el resumen.
3. **Resumen normalizado** (`resumen_indicadores_pei_2026_2030_ai_ready.csv`) — estructura,
   descripciones, dimensiones, dependencias responsables y comentarios/escalas.

## Correcciones aplicadas por la auditoría (fichas ≻ resumen)

- 1401: línea base 50 (2025), meta 2026 = 60 (el resumen decía 0/5).
- 1402: línea base 0 (2026), meta 2026 = 0 (el resumen decía 5/10).
- 1501: PUNTAJE, base 2.03, metas 2.2/2.5/2.6/2.8/3 (el resumen decía 2.8/3.0).
- 1502: PUNTAJE, base 3.04, metas 3.2/3.4/3.6/3.8/4 (el resumen decía 3.2/3.5).
- 1503: año de línea base 2025.
- 1702: meta 2026 = 0 (el resumen decía 10).
- 1802: meta 2026 = 5 (el resumen decía 20).
- 2101: dimensión Eficacia (faltante en resumen).
- 2102: dimensión Eficiencia (el resumen decía Eficacia).
- 2201: dimensión Calidad (el resumen decía Eficiencia).
- OE4/OE5/OE6: bloque técnico completo (fórmula, unidad, frecuencia, cobertura, sentido,
  línea base, meta 2026) tomado de la auditoría; metas 2027–2030 de la matriz del PDF.

## Decisiones documentadas

- **2101 — dependencias**: el resumen no traía dependencias; se asignaron las de su
  indicador hermano 2102 (misma A.E.2.1): DDHH, IIJ, DAJ. Revisar con la DGPD.
- **6107 — dimensión**: la ficha marca varias opciones ("Eficiencia | Eficacia | Calidad");
  se conservó **Calidad** (valor del resumen). Revisar con la DGPD.
- **4602 — año de línea base 2028**: valor de la ficha; la medición inicia con el nuevo
  programa de formación continua (meta 2026 = 0).
- **5401 — unidad**: la ficha dice "Metros cuadrados"; el enum del sistema la registra
  como NUMERO y el comentario conserva la unidad física.
- **Indicadores OE (códigos 1–6)**: responsable asignado a la DGPD (coordinadora del PEI,
  según fichas de indicadores de OE). Para OE5 se agregó la DGAF como corresponsable.
- **Nombres de dependencias normalizados** (p. ej. "Direccion Asuntos Juridicos" →
  "Dirección de Asuntos Jurídicos"; "Dirección de Estadística Judicial" →
  "Dirección de Estadísticas Judiciales").
- **Descripciones**: solo se incluyen las presentes en las fuentes (resumen OE1–OE3 y
  fichas del anexo del PDF: 1402, 2201, 3401, 4301, 5201, 6101). Los ~30 indicadores de
  OE4–OE6 sin descripción en las fuentes quedan `null` hasta ingerir las 7 planillas de
  fichas técnicas completas (ETL, fase posterior).
- **Escalas de avance**: `escala[]` transcribe las escaleras de niveles de las fichas;
  la convención de cálculo es `pct = pctMax` del nivel reportado (dominio `escala.ts`).
  `esEscala` se deriva de la presencia de `escala[]`.
- **Ciclo de vida** (`esCicloVida`): se deriva automáticamente cuando las metas terminan
  en 0 después de años con meta > 0 (p. ej. 2201: 25/50/75/100/0). Los 0 posteriores al
  cierre se marcan `esPeriodoConcluido` en la tabla Meta (no son meta cero).
- **Requieren diagnóstico previo** (`requiereDiagnostico`, 16 códigos según el DOCX
  oficial de diagnósticos): 1301, 1701, 2101, 2102, 2201, 3104, 3301, 3601, 3701, 3805,
  4101, 4201, 4701, 5101, 5402, 6401. El DOCX declara 18 pero enumera 16 (inconsistencia
  documentada en la fuente).

## Actualización del 02/08/2026 — `actualizacion.csv` (planilla entregada por la DGPD)

Ingesta vía `npm run data:actualizar` (reporte completo en `reporte-diferencias.md`).
Se aplicaron: **135 adiciones** (fuentes de información para los 83 indicadores AE,
descripciones OE4-6), **82 cambios de texto**, **31 escalas** con descripciones
específicas (corrigió el corrimiento de comentarios de OE2: 2102 ahora tiene su
escala de 4 niveles), y los siguientes **conflictos decididos por el usuario**:

- **Líneas base — manda la planilla nueva** (difieren de la auditoría 09.03):
  1401: 50(2025)→**0(2026)** · 1402: 0(2026)→**5(2027)** · 1501: 2.03→**2.8** ·
  1502: 3.04→**3.2** · 1503: año 2025→**2026**. Cuatro celdas llegaron corruptas
  por Excel ("2026:00:00", "44:02.8") y fueron interpretadas.
- **Unidad 1501/1502**: se CONSERVÓ **PUNTAJE** (la planilla decía Número).
- **Dimensiones**: 2102 Eficiencia→**Eficacia** · 2201 Calidad→**Eficiencia**.
- **4601**: meta 2030 100→**0** — pasa a ciclo de vida (concluye 2029).
- **Vacíos en fuente** (se conservó lo nuestro): 2101 dimensión/dependencias.

Los 6 indicadores de nivel OE (códigos 1-6) no venían en la planilla: sin cambios.

## Carga de avances reales — 02/08/2026

- **Líneas base 3101/3102/3103 fijadas con el cierre estadístico 2025** ("Medición
  de la Gestión Jurisdiccional 2025", Dir. de Estadísticas Judiciales; agregado
  nacional de 359 juzgados en 19 circunscripciones, 3102 con 357/359 por falta de
  pendientes iniciales en 2 juzgados): 3101 = **1,068** · 3102 = **6,3633** ·
  3103 = **5,6632** (año base 2025). Antes figuraban "a determinar al cierre 2025".
- Se agregó el **período ANUAL 2025 (id 6)** como año de referencia pre-PEI
  (consultable en tableros, sin metas → cumplimiento SIN_DATO) y el dataset
  `mediciones-reales.json` + `prisma/seedMediciones.ts` con las mediciones
  oficiales 2025/2026 (9 APROBADAS de alta confianza + 3 condicionadas en
  BORRADOR: 4101, 5401, 5402).
