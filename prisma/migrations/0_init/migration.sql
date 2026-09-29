-- CreateEnum
CREATE TYPE "Nivel" AS ENUM ('OE', 'AE');

-- CreateEnum
CREATE TYPE "Sentido" AS ENUM ('ASC', 'DESC');

-- CreateEnum
CREATE TYPE "Unidad" AS ENUM ('PORCENTAJE', 'NUMERO', 'PUNTAJE', 'INDICE');

-- CreateEnum
CREATE TYPE "RolResp" AS ENUM ('PRINCIPAL', 'CORRESPONSABLE', 'FUENTE');

-- CreateEnum
CREATE TYPE "TipoPeriodo" AS ENUM ('MENSUAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "EstadoWF" AS ENUM ('BORRADOR', 'ENVIADO', 'EN_REVISION', 'OBSERVADO', 'APROBADO', 'RECHAZADO', 'RECTIFICADO');

-- CreateEnum
CREATE TYPE "ResultadoVal" AS ENUM ('APROBADO', 'OBSERVADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMIN', 'DGPD_VALIDADOR', 'DEPENDENCIA_CARGA', 'AUTORIDAD', 'CONSULTA');

-- CreateEnum
CREATE TYPE "ScopeUmbral" AS ENUM ('GLOBAL', 'OE', 'AE', 'INDICADOR');

-- CreateEnum
CREATE TYPE "TipoNotif" AS ENUM ('CARGA_ENVIADA', 'CARGA_EN_REVISION', 'CARGA_APROBADA', 'CARGA_OBSERVADA', 'CARGA_RECHAZADA', 'CARGA_RECTIFICADA', 'INDICADOR_CRITICO', 'PLAZO_PROXIMO', 'PRORROGA_OTORGADA', 'CARGA_CERRADA', 'CARGA_HABILITADA');

-- CreateEnum
CREATE TYPE "ScopeVentana" AS ENUM ('GLOBAL', 'OE', 'AE', 'INDICADOR', 'DEPENDENCIA');

-- CreateEnum
CREATE TYPE "TipoVentana" AS ENUM ('PLAZO', 'PRORROGA', 'APERTURA', 'CIERRE');

-- CreateTable
CREATE TABLE "ObjetivoEstrategico" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "ObjetivoEstrategico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccionEstrategica" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "oeId" INTEGER NOT NULL,

    CONSTRAINT "AccionEstrategica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Indicador" (
    "id" SERIAL NOT NULL,
    "codigo" INTEGER NOT NULL,
    "nivel" "Nivel" NOT NULL,
    "oeId" INTEGER NOT NULL,
    "aeId" INTEGER,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "variables" TEXT,
    "formula" TEXT,
    "dimension" TEXT,
    "ambito" TEXT,
    "unidad" "Unidad" NOT NULL,
    "frecuencia" "TipoPeriodo" NOT NULL DEFAULT 'ANUAL',
    "cobertura" TEXT NOT NULL DEFAULT 'Nacional',
    "sentido" "Sentido" NOT NULL,
    "lineaBase" DECIMAL(16,4),
    "anioLineaBase" INTEGER,
    "basePendiente" BOOLEAN NOT NULL DEFAULT false,
    "esEscala" BOOLEAN NOT NULL DEFAULT false,
    "esCicloVida" BOOLEAN NOT NULL DEFAULT false,
    "peso" DECIMAL(6,3) NOT NULL DEFAULT 1,
    "fuenteInfo" TEXT,
    "comentarios" TEXT,
    "requiereDiagnostico" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Indicador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meta" (
    "id" SERIAL NOT NULL,
    "indicadorId" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "valorMeta" DECIMAL(16,4),
    "esPeriodoConcluido" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscalaIndicador" (
    "id" SERIAL NOT NULL,
    "indicadorId" INTEGER NOT NULL,
    "nivel" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "pctMin" DECIMAL(6,2) NOT NULL,
    "pctMax" DECIMAL(6,2) NOT NULL,

    CONSTRAINT "EscalaIndicador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dependencia" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "area" TEXT,
    "referente" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Dependencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndicadorDependencia" (
    "indicadorId" INTEGER NOT NULL,
    "dependenciaId" INTEGER NOT NULL,
    "rol" "RolResp" NOT NULL,

    CONSTRAINT "IndicadorDependencia_pkey" PRIMARY KEY ("indicadorId","dependenciaId","rol")
);

-- CreateTable
CREATE TABLE "Circunscripcion" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Circunscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Periodo" (
    "id" SERIAL NOT NULL,
    "anio" INTEGER NOT NULL,
    "tipo" "TipoPeriodo" NOT NULL,
    "numero" INTEGER,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "fechaLimiteCarga" TIMESTAMP(3),

    CONSTRAINT "Periodo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicion" (
    "id" BIGSERIAL NOT NULL,
    "indicadorId" INTEGER NOT NULL,
    "periodoId" INTEGER NOT NULL,
    "dependenciaId" INTEGER NOT NULL,
    "circunscripcionId" INTEGER,
    "numerador" DECIMAL(18,4),
    "denominador" DECIMAL(18,4),
    "nivelEscala" INTEGER,
    "valoresVariables" JSONB,
    "valorObservado" DECIMAL(18,4),
    "estado" "EstadoWF" NOT NULL DEFAULT 'BORRADOR',
    "version" INTEGER NOT NULL DEFAULT 1,
    "fechaReporte" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCorte" TIMESTAMP(3),
    "fuente" TEXT,
    "usuarioCargaId" INTEGER,
    "observaciones" TEXT,

    CONSTRAINT "Medicion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Validacion" (
    "id" BIGSERIAL NOT NULL,
    "medicionId" BIGINT NOT NULL,
    "usuarioId" INTEGER,
    "resultado" "ResultadoVal" NOT NULL,
    "comentario" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Validacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidencia" (
    "id" BIGSERIAL NOT NULL,
    "medicionId" BIGINT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "tipo" TEXT,
    "rutaOUrl" TEXT,
    "contenido" BYTEA,
    "mimeType" TEXT,
    "tamanioBytes" INTEGER,
    "hashSha256" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" INTEGER,
    "estado" TEXT NOT NULL DEFAULT 'cargada',

    CONSTRAINT "Evidencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialEstado" (
    "id" BIGSERIAL NOT NULL,
    "medicionId" BIGINT NOT NULL,
    "estadoAnterior" "EstadoWF",
    "estadoNuevo" "EstadoWF" NOT NULL,
    "usuarioId" INTEGER,
    "comentario" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialEstado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "tema" TEXT NOT NULL DEFAULT 'agentes',

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioRol" (
    "usuarioId" INTEGER NOT NULL,
    "rol" "RolUsuario" NOT NULL,

    CONSTRAINT "UsuarioRol_pkey" PRIMARY KEY ("usuarioId","rol")
);

-- CreateTable
CREATE TABLE "UsuarioDependencia" (
    "usuarioId" INTEGER NOT NULL,
    "dependenciaId" INTEGER NOT NULL,

    CONSTRAINT "UsuarioDependencia_pkey" PRIMARY KEY ("usuarioId","dependenciaId")
);

-- CreateTable
CREATE TABLE "PndPilar" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "PndPilar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PndObjetivo" (
    "id" SERIAL NOT NULL,
    "pilarId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "PndObjetivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ods" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Ods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OePnd" (
    "oeId" INTEGER NOT NULL,
    "pndObjetivoId" INTEGER NOT NULL,

    CONSTRAINT "OePnd_pkey" PRIMARY KEY ("oeId","pndObjetivoId")
);

-- CreateTable
CREATE TABLE "OeOds" (
    "oeId" INTEGER NOT NULL,
    "odsId" INTEGER NOT NULL,

    CONSTRAINT "OeOds_pkey" PRIMARY KEY ("oeId","odsId")
);

-- CreateTable
CREATE TABLE "Riesgo" (
    "id" SERIAL NOT NULL,
    "oeId" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "probabilidad" INTEGER,
    "impacto" INTEGER,
    "evaluacion" TEXT,
    "mitigacion" TEXT,

    CONSTRAINT "Riesgo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoteEtl" (
    "id" BIGSERIAL NOT NULL,
    "archivo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" INTEGER,
    "aceptados" INTEGER NOT NULL DEFAULT 0,
    "rechazados" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LoteEtl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorEtl" (
    "id" BIGSERIAL NOT NULL,
    "loteId" BIGINT NOT NULL,
    "fila" INTEGER,
    "campo" TEXT,
    "mensaje" TEXT NOT NULL,

    CONSTRAINT "ErrorEtl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parametro" (
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "Parametro_pkey" PRIMARY KEY ("clave")
);

-- CreateTable
CREATE TABLE "UmbralCriticidad" (
    "id" SERIAL NOT NULL,
    "scope" "ScopeUmbral" NOT NULL,
    "entidad" TEXT NOT NULL,
    "verde" INTEGER NOT NULL,
    "amarillo" INTEGER NOT NULL,
    "azul" INTEGER,

    CONSTRAINT "UmbralCriticidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" BIGSERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tipo" "TipoNotif" NOT NULL,
    "medicionId" BIGINT,
    "indicadorId" INTEGER,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT,
    "url" TEXT NOT NULL,
    "leidaEn" TIMESTAMP(3),
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentanaCarga" (
    "id" SERIAL NOT NULL,
    "periodoId" INTEGER NOT NULL,
    "scope" "ScopeVentana" NOT NULL,
    "entidad" TEXT NOT NULL,
    "tipo" "TipoVentana" NOT NULL,
    "fechaLimite" TIMESTAMP(3),
    "motivo" TEXT,
    "usuarioId" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VentanaCarga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlaCarga" (
    "id" SERIAL NOT NULL,
    "medicionId" BIGINT NOT NULL,
    "indicadorId" INTEGER NOT NULL,
    "dependenciaId" INTEGER NOT NULL,
    "periodoId" INTEGER NOT NULL,
    "fechaLimite" TIMESTAMP(3),
    "fechaEnvio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diasDesvio" INTEGER,
    "enPlazo" BOOLEAN NOT NULL DEFAULT true,
    "conProrroga" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SlaCarga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresupuestoEjercicio" (
    "anio" INTEGER NOT NULL,
    "asignado" DECIMAL(20,2) NOT NULL,
    "ejecutado" DECIMAL(20,2) NOT NULL,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "usuarioId" INTEGER,

    CONSTRAINT "PresupuestoEjercicio_pkey" PRIMARY KEY ("anio")
);

-- CreateIndex
CREATE UNIQUE INDEX "ObjetivoEstrategico_codigo_key" ON "ObjetivoEstrategico"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "AccionEstrategica_codigo_key" ON "AccionEstrategica"("codigo");

-- CreateIndex
CREATE INDEX "AccionEstrategica_oeId_idx" ON "AccionEstrategica"("oeId");

-- CreateIndex
CREATE UNIQUE INDEX "Indicador_codigo_key" ON "Indicador"("codigo");

-- CreateIndex
CREATE INDEX "Indicador_oeId_idx" ON "Indicador"("oeId");

-- CreateIndex
CREATE INDEX "Indicador_aeId_idx" ON "Indicador"("aeId");

-- CreateIndex
CREATE UNIQUE INDEX "Meta_indicadorId_anio_key" ON "Meta"("indicadorId", "anio");

-- CreateIndex
CREATE UNIQUE INDEX "EscalaIndicador_indicadorId_nivel_key" ON "EscalaIndicador"("indicadorId", "nivel");

-- CreateIndex
CREATE UNIQUE INDEX "Dependencia_nombre_key" ON "Dependencia"("nombre");

-- CreateIndex
CREATE INDEX "IndicadorDependencia_dependenciaId_idx" ON "IndicadorDependencia"("dependenciaId");

-- CreateIndex
CREATE INDEX "IndicadorDependencia_indicadorId_idx" ON "IndicadorDependencia"("indicadorId");

-- CreateIndex
CREATE UNIQUE INDEX "Circunscripcion_nombre_key" ON "Circunscripcion"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Periodo_anio_tipo_numero_key" ON "Periodo"("anio", "tipo", "numero");

-- CreateIndex
CREATE INDEX "Medicion_indicadorId_idx" ON "Medicion"("indicadorId");

-- CreateIndex
CREATE INDEX "Medicion_periodoId_idx" ON "Medicion"("periodoId");

-- CreateIndex
CREATE INDEX "Medicion_estado_idx" ON "Medicion"("estado");

-- CreateIndex
CREATE INDEX "Medicion_dependenciaId_idx" ON "Medicion"("dependenciaId");

-- CreateIndex
CREATE UNIQUE INDEX "Medicion_indicadorId_periodoId_circunscripcionId_version_key" ON "Medicion"("indicadorId", "periodoId", "circunscripcionId", "version");

-- CreateIndex
CREATE INDEX "Validacion_medicionId_idx" ON "Validacion"("medicionId");

-- CreateIndex
CREATE INDEX "Evidencia_medicionId_idx" ON "Evidencia"("medicionId");

-- CreateIndex
CREATE INDEX "HistorialEstado_medicionId_idx" ON "HistorialEstado"("medicionId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "UsuarioRol_usuarioId_idx" ON "UsuarioRol"("usuarioId");

-- CreateIndex
CREATE INDEX "UsuarioDependencia_dependenciaId_idx" ON "UsuarioDependencia"("dependenciaId");

-- CreateIndex
CREATE UNIQUE INDEX "PndPilar_numero_key" ON "PndPilar"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "PndObjetivo_codigo_key" ON "PndObjetivo"("codigo");

-- CreateIndex
CREATE INDEX "PndObjetivo_pilarId_idx" ON "PndObjetivo"("pilarId");

-- CreateIndex
CREATE UNIQUE INDEX "Ods_numero_key" ON "Ods"("numero");

-- CreateIndex
CREATE INDEX "OePnd_pndObjetivoId_idx" ON "OePnd"("pndObjetivoId");

-- CreateIndex
CREATE INDEX "OeOds_odsId_idx" ON "OeOds"("odsId");

-- CreateIndex
CREATE INDEX "Riesgo_oeId_idx" ON "Riesgo"("oeId");

-- CreateIndex
CREATE INDEX "ErrorEtl_loteId_idx" ON "ErrorEtl"("loteId");

-- CreateIndex
CREATE UNIQUE INDEX "UmbralCriticidad_scope_entidad_key" ON "UmbralCriticidad"("scope", "entidad");

-- CreateIndex
CREATE INDEX "Notificacion_usuarioId_leidaEn_idx" ON "Notificacion"("usuarioId", "leidaEn");

-- CreateIndex
CREATE INDEX "Notificacion_usuarioId_creadaEn_idx" ON "Notificacion"("usuarioId", "creadaEn");

-- CreateIndex
CREATE INDEX "VentanaCarga_periodoId_scope_entidad_idx" ON "VentanaCarga"("periodoId", "scope", "entidad");

-- CreateIndex
CREATE INDEX "VentanaCarga_periodoId_tipo_idx" ON "VentanaCarga"("periodoId", "tipo");

-- CreateIndex
CREATE INDEX "SlaCarga_periodoId_dependenciaId_idx" ON "SlaCarga"("periodoId", "dependenciaId");

-- CreateIndex
CREATE INDEX "SlaCarga_medicionId_idx" ON "SlaCarga"("medicionId");

-- AddForeignKey
ALTER TABLE "AccionEstrategica" ADD CONSTRAINT "AccionEstrategica_oeId_fkey" FOREIGN KEY ("oeId") REFERENCES "ObjetivoEstrategico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Indicador" ADD CONSTRAINT "Indicador_oeId_fkey" FOREIGN KEY ("oeId") REFERENCES "ObjetivoEstrategico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Indicador" ADD CONSTRAINT "Indicador_aeId_fkey" FOREIGN KEY ("aeId") REFERENCES "AccionEstrategica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meta" ADD CONSTRAINT "Meta_indicadorId_fkey" FOREIGN KEY ("indicadorId") REFERENCES "Indicador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalaIndicador" ADD CONSTRAINT "EscalaIndicador_indicadorId_fkey" FOREIGN KEY ("indicadorId") REFERENCES "Indicador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndicadorDependencia" ADD CONSTRAINT "IndicadorDependencia_indicadorId_fkey" FOREIGN KEY ("indicadorId") REFERENCES "Indicador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndicadorDependencia" ADD CONSTRAINT "IndicadorDependencia_dependenciaId_fkey" FOREIGN KEY ("dependenciaId") REFERENCES "Dependencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicion" ADD CONSTRAINT "Medicion_indicadorId_fkey" FOREIGN KEY ("indicadorId") REFERENCES "Indicador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicion" ADD CONSTRAINT "Medicion_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "Periodo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicion" ADD CONSTRAINT "Medicion_dependenciaId_fkey" FOREIGN KEY ("dependenciaId") REFERENCES "Dependencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Validacion" ADD CONSTRAINT "Validacion_medicionId_fkey" FOREIGN KEY ("medicionId") REFERENCES "Medicion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidencia" ADD CONSTRAINT "Evidencia_medicionId_fkey" FOREIGN KEY ("medicionId") REFERENCES "Medicion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialEstado" ADD CONSTRAINT "HistorialEstado_medicionId_fkey" FOREIGN KEY ("medicionId") REFERENCES "Medicion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioRol" ADD CONSTRAINT "UsuarioRol_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioDependencia" ADD CONSTRAINT "UsuarioDependencia_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioDependencia" ADD CONSTRAINT "UsuarioDependencia_dependenciaId_fkey" FOREIGN KEY ("dependenciaId") REFERENCES "Dependencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PndObjetivo" ADD CONSTRAINT "PndObjetivo_pilarId_fkey" FOREIGN KEY ("pilarId") REFERENCES "PndPilar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OePnd" ADD CONSTRAINT "OePnd_oeId_fkey" FOREIGN KEY ("oeId") REFERENCES "ObjetivoEstrategico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OePnd" ADD CONSTRAINT "OePnd_pndObjetivoId_fkey" FOREIGN KEY ("pndObjetivoId") REFERENCES "PndObjetivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OeOds" ADD CONSTRAINT "OeOds_oeId_fkey" FOREIGN KEY ("oeId") REFERENCES "ObjetivoEstrategico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OeOds" ADD CONSTRAINT "OeOds_odsId_fkey" FOREIGN KEY ("odsId") REFERENCES "Ods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Riesgo" ADD CONSTRAINT "Riesgo_oeId_fkey" FOREIGN KEY ("oeId") REFERENCES "ObjetivoEstrategico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorEtl" ADD CONSTRAINT "ErrorEtl_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "LoteEtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

