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
