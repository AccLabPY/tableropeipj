import { requireApi } from "@/server/auth/guards";
import { prismaFor } from "@/server/db/client";
import type { Ctx } from "@/server/db/env";
import {
  guardarBorrador,
  enviar,
  tomarEnRevision,
  validar,
  agregarEvidenciaArchivo,
  eliminarEvidencia,
} from "@/server/services/medicion.service";
import { toMedicionResumen } from "@/server/services/medicion-dto";
import { INCLUDE_MEDICION_FICHA } from "@/server/repositories/medicion.repo";

export const dynamic = "force-dynamic";

async function ctxDe(email: string): Promise<Ctx> {
  const db = prismaFor("test");
  const u = await db.usuario.findUniqueOrThrow({
    where: { email },
    include: { roles: true, dependencias: true },
  });
  return {
    db,
    env: "test",
    actor: {
      userId: u.id,
      nombre: u.nombre,
      email: u.email,
      roles: u.roles.map((r) => r.rol) as never,
      dependenciaIds: u.dependencias.map((d) => d.dependenciaId),
    },
  };
}

export async function GET() {
  await requireApi("ADMIN");
  const log: string[] = [];
  const db = prismaFor("test");
  const carga = await ctxDe("carga.dgch@pj.gov.py");
  const dgpd = await ctxDe("dgpd@pj.gov.py");

  const m1 = await guardarBorrador(carga, {
    indicadorCodigo: 4102,
    anio: 2027,
    valores: { valor: 70 },
    fuente: "Smoke test",
    observaciones: "Prueba automatizada.",
  } as never);
  log.push(`1) guardarBorrador id=${m1.id} estado=${m1.estado}`);

  const pdf = Buffer.from("%PDF-1.4 " + "x".repeat(40_000) + " smoke");
  await agregarEvidenciaArchivo(carga, m1.id, {
    nombreArchivo: "informe-smoke.pdf",
    mimeType: "application/pdf",
    contenido: pdf,
  });
  log.push("2) agregarEvidenciaArchivo OK (40KB)");

  try {
    await agregarEvidenciaArchivo(carga, m1.id, {
      nombreArchivo: "virus.exe",
      mimeType: "application/x-msdownload",
      contenido: Buffer.from("x"),
    });
    log.push("2b) FALLO: debió rechazar tipo no permitido");
  } catch (e) {
    log.push(`2b) OK rechazado tipo: ${(e as { code?: string }).code}`);
  }

  try {
    await agregarEvidenciaArchivo(carga, m1.id, {
      nombreArchivo: "grande.pdf",
      mimeType: "application/pdf",
      contenido: Buffer.alloc(26 * 1024 * 1024),
    });
    log.push("2c) FALLO: debió rechazar >25MB");
  } catch (e) {
    log.push(`2c) OK rechazado tamaño: ${(e as { code?: string }).code}`);
  }

  await enviar(carga, m1.id);
  log.push("3) enviar OK (BORRADOR→ENVIADO)");

  const m2 = await tomarEnRevision(dgpd, m1.id);
  log.push(`4) tomarEnRevision OK estado=${m2.estado}`);

  const full = await db.medicion.findFirstOrThrow({
    where: { id: m1.id },
    include: INCLUDE_MEDICION_FICHA,
  });
  const dto = toMedicionResumen(full);
  log.push(`5) evidencias=${JSON.stringify(dto.evidencias)}`);
  if (dto.evidencias.length !== 1) throw new Error("esperaba 1 evidencia");
  if (!dto.evidencias[0].tieneArchivo) throw new Error("tieneArchivo debería ser true");
  if (dto.evidencias[0].tamanioBytes !== pdf.length) throw new Error("tamanioBytes incorrecto");
  log.push(`5b) claves select liviano=${Object.keys(full.evidencias[0]).join(",")}`);
  if ("contenido" in full.evidencias[0]) throw new Error("¡select liviano trajo el binario!");

  try {
    await eliminarEvidencia(carga, BigInt(dto.evidencias[0].id));
    log.push("6) FALLO: debió rechazar borrado en EN_REVISION");
  } catch (e) {
    log.push(`6) OK rechazado borrado: ${(e as { code?: string }).code}`);
  }

  const m3 = await validar(dgpd, m1.id, {
    resultado: "APROBADO",
    comentario: "OK smoke test",
  });
  log.push(`7) validar OK estado=${m3.estado}`);

  const conBinario = await db.evidencia.findFirstOrThrow({
    where: { medicionId: m1.id },
    select: { contenido: true, mimeType: true },
  });
  const igual = Buffer.compare(Buffer.from(conBinario.contenido!), pdf) === 0;
  log.push(`8) bytes idénticos=${igual} mimeType=${conBinario.mimeType}`);
  if (!igual) throw new Error("MISMATCH de bytes");

  const idEvidenciaParaDescarga = dto.evidencias[0].id;

  await db.historialEstado.deleteMany({ where: { medicionId: m1.id } });
  await db.validacion.deleteMany({ where: { medicionId: m1.id } });
  // NO se borra la evidencia todavía: se descarga por HTTP real primero.
  await db.medicion.update({ where: { id: m1.id }, data: {} }); // noop, deja medicionId vivo
  log.push(`9) evidencia dejada viva para descarga HTTP: id=${idEvidenciaParaDescarga}`);

  return Response.json({ ok: true, log, idEvidencia: idEvidenciaParaDescarga, medicionId: m1.id.toString() });
}

export async function DELETE(req: Request) {
  await requireApi("ADMIN");
  const db = prismaFor("test");
  const { medicionId } = await req.json();
  const id = BigInt(medicionId);
  await db.evidencia.deleteMany({ where: { medicionId: id } });
  await db.medicion.delete({ where: { id } });
  return Response.json({ ok: true });
}
