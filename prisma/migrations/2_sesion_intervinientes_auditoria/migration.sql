-- Revocación de sesiones: se incrementa al desactivar, cambiar contraseña o
-- cerrar sesiones; el JWT emitido con otra versión deja de ser válido.
ALTER TABLE "Usuario" ADD COLUMN "sesionVersion" INTEGER NOT NULL DEFAULT 0;

-- Regla de autovalidación: usuarios que intervinieron en cada versión.
ALTER TABLE "Medicion" ADD COLUMN "intervinientesIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- Backfill: quien creó la versión (salvo versiones de rectificación, cuyo
-- creador es el validador que rectificó), quien la envió y quienes adjuntaron.
UPDATE "Medicion" m SET "intervinientesIds" = COALESCE((
  SELECT array_agg(DISTINCT u ORDER BY u) FROM (
    SELECT m."usuarioCargaId" AS u
    WHERE NOT EXISTS (
      SELECT 1 FROM "HistorialEstado" h
      WHERE h."medicionId" = m.id AND h."estadoAnterior" IS NULL
        AND h.comentario LIKE 'Versión de rectificación%'
    )
    UNION SELECT h."usuarioId" FROM "HistorialEstado" h
      WHERE h."medicionId" = m.id AND h."estadoNuevo" = 'ENVIADO'
    UNION SELECT e."usuarioId" FROM "Evidencia" e WHERE e."medicionId" = m.id
  ) x WHERE u IS NOT NULL
), ARRAY[]::INTEGER[]);

-- Bitácora de cambios administrativos.
CREATE TABLE "AuditoriaAdmin" (
    "id" BIGSERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" INTEGER NOT NULL,
    "usuarioEmail" TEXT NOT NULL,
    "env" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT,
    "antes" JSONB,
    "despues" JSONB,
    "motivo" TEXT,

    CONSTRAINT "AuditoriaAdmin_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditoriaAdmin_fecha_idx" ON "AuditoriaAdmin"("fecha");
CREATE INDEX "AuditoriaAdmin_entidad_entidadId_fecha_idx" ON "AuditoriaAdmin"("entidad", "entidadId", "fecha");
CREATE INDEX "AuditoriaAdmin_usuarioId_fecha_idx" ON "AuditoriaAdmin"("usuarioId", "fecha");
CREATE INDEX "AuditoriaAdmin_accion_fecha_idx" ON "AuditoriaAdmin"("accion", "fecha");

-- Append-only: ninguna fila de auditoría puede modificarse ni borrarse.
CREATE FUNCTION "auditoria_inmutable"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditoriaAdmin es append-only: no se permite %', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AuditoriaAdmin_inmutable"
  BEFORE UPDATE OR DELETE ON "AuditoriaAdmin"
  FOR EACH ROW EXECUTE FUNCTION "auditoria_inmutable"();
