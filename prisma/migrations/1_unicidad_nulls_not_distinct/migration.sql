-- Los índices únicos de Medicion y Periodo incluyen columnas que son NULL en
-- la operación normal (circunscripcionId en mediciones nacionales, numero en
-- períodos anuales). PostgreSQL trata los NULL como distintos, así que esos
-- índices no impedían duplicados. Se recrean con el MISMO nombre y NULLS NOT
-- DISTINCT (PostgreSQL 15+). Prisma 5.22 no introspecciona esa marca: mismo
-- nombre y columnas = sin drift en futuros `migrate dev`.

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM (
    SELECT 1 FROM "Medicion"
    GROUP BY "indicadorId", "periodoId", "circunscripcionId", "version"
    HAVING count(*) > 1
  ) d;
  IF n > 0 THEN
    RAISE EXCEPTION 'Medicion: % grupos duplicados (indicador, período, circunscripción, versión); depurar antes de migrar', n;
  END IF;

  SELECT count(*) INTO n FROM (
    SELECT 1 FROM "Periodo" GROUP BY "anio", "tipo", "numero" HAVING count(*) > 1
  ) d;
  IF n > 0 THEN
    RAISE EXCEPTION 'Periodo: % grupos duplicados (año, tipo, número); depurar antes de migrar', n;
  END IF;
END $$;

DROP INDEX "Medicion_indicadorId_periodoId_circunscripcionId_version_key";
CREATE UNIQUE INDEX "Medicion_indicadorId_periodoId_circunscripcionId_version_key"
  ON "Medicion"("indicadorId", "periodoId", "circunscripcionId", "version") NULLS NOT DISTINCT;

DROP INDEX "Periodo_anio_tipo_numero_key";
CREATE UNIQUE INDEX "Periodo_anio_tipo_numero_key"
  ON "Periodo"("anio", "tipo", "numero") NULLS NOT DISTINCT;
