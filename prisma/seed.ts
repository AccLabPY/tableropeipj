/**
 * Seed idempotente del PEI 2026-2030 desde el dataset canónico (prisma/data/*.json).
 *
 * - Ejecutar contra PROD:  npm run db:seed:prod   (estructura + usuarios, SIN mediciones)
 * - Ejecutar contra TEST:  npm run db:seed:test   (además SEED_MOCKUP=1 → mediciones demo)
 *
 * Upserts por clave natural (codigo/nombre/email) con IDs explícitos deterministas,
 * idénticos en ambas databases (requisito del switch prod/test: los usuarios y
 * catálogos deben coincidir para que las referencias de la base test sean válidas).
 */
import { PrismaClient, Prisma, RolResp, EstadoWF } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  ANIOS_PEI,
  CODIGOS_DIAGNOSTICO,
  cargarAcciones,
  cargarIndicadores,
  cargarObjetivos,
  cargarRiesgos,
  esCicloVida,
  indicesConcluidos,
} from "./data/load";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();
const SEED_MOCKUP = process.env.SEED_MOCKUP === "1";

// ---------------------------------------------------------------------------
// PND / ODS (matriz de vinculación del PEI)
// ---------------------------------------------------------------------------
const PILARES: Record<number, string> = {
  2: "Infraestructura, Innovación y Competitividad",
  4: "Instituciones, Seguridad y Proyección Internacional",
};
const PND = [
  { pilar: 4, codigo: "4.1.1", nombre: "Consolidar la profesionalización del servicio público con foco en la generación del valor público" },
  { pilar: 4, codigo: "4.1.3", nombre: "Institucionalizar el Sistema Nacional de Planificación orientado a resultados, vinculado a presupuesto y con monitoreo y evaluación permanentes" },
  { pilar: 4, codigo: "4.2.1", nombre: "Asegurar la transparencia, la rendición de cuentas clara y accesible, y la prevención de la corrupción en la gestión pública" },
  { pilar: 4, codigo: "4.2.3", nombre: "Asegurar la promoción, protección y cumplimiento de los derechos humanos" },
  { pilar: 4, codigo: "4.2.4", nombre: "Lograr un sistema de justicia imparcial, independiente, oportuno y accesible, que asegure la confianza ciudadana y el respeto a los derechos" },
  { pilar: 2, codigo: "2.2.5", nombre: "Garantizar la tenencia y propiedad legal de la tierra" },
];

// ---------------------------------------------------------------------------
// Usuarios demo (mismos IDs en ambas DBs). Password documentado en README.
// ---------------------------------------------------------------------------
const PASSWORD_DEMO = "pei2026";
const USUARIOS: {
  id: number;
  nombre: string;
  email: string;
  roles: ("ADMIN" | "DGPD_VALIDADOR" | "DEPENDENCIA_CARGA" | "AUTORIDAD" | "CONSULTA")[];
  dependencias: string[];
}[] = [
  { id: 1, nombre: "Administrador PEI", email: "admin@pj.gov.py", roles: ["ADMIN"], dependencias: [] },
  { id: 2, nombre: "Validador DGPD", email: "dgpd@pj.gov.py", roles: ["DGPD_VALIDADOR"], dependencias: [] },
  { id: 3, nombre: "Carga Capital Humano", email: "carga.dgch@pj.gov.py", roles: ["DEPENDENCIA_CARGA"], dependencias: ["Dirección General de Capital Humano"] },
  { id: 4, nombre: "Carga DGTIC", email: "carga.dgtic@pj.gov.py", roles: ["DEPENDENCIA_CARGA"], dependencias: ["Dirección General de Tecnología de la Información y las Comunicaciones"] },
  { id: 5, nombre: "Carga Estadísticas Judiciales", email: "carga.estadisticas@pj.gov.py", roles: ["DEPENDENCIA_CARGA"], dependencias: ["Dirección de Estadísticas Judiciales"] },
  { id: 6, nombre: "Autoridad CSJ", email: "autoridad@pj.gov.py", roles: ["AUTORIDAD"], dependencias: [] },
  { id: 7, nombre: "Usuario Consulta", email: "consulta@pj.gov.py", roles: ["CONSULTA"], dependencias: [] },
];

interface MockupMedicion {
  codigo: number;
  estado: EstadoWF;
  valor: number;
  numerador?: number;
  denominador?: number;
  nivelEscala?: number;
  fuente?: string;
  obs?: string;
  validacion?: string;
  rectificadaPor?: { valor: number; obs?: string; validacion?: string };
}

const D = (n: number) => new Prisma.Decimal(n);

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? "";
  const dbName = dbUrl.split("?")[0]?.split("/").pop() ?? "?";
  console.log(`Seed PEI 2026-2030 → database: ${dbName} · mockup: ${SEED_MOCKUP ? "SÍ" : "no"}\n`);

  // ---- Parámetros y umbral global -----------------------------------------
  await prisma.parametro.upsert({
    where: { clave: "semaforo_verde" },
    update: { valor: "0.90" },
    create: { clave: "semaforo_verde", valor: "0.90" },
  });
  await prisma.parametro.upsert({
    where: { clave: "semaforo_amarillo" },
    update: { valor: "0.70" },
    create: { clave: "semaforo_amarillo", valor: "0.70" },
  });
  await prisma.umbralCriticidad.upsert({
    where: { scope_entidad: { scope: "GLOBAL", entidad: "GLOBAL" } },
    update: {},
    create: { scope: "GLOBAL", entidad: "GLOBAL", verde: 90, amarillo: 70 },
  });

  // ---- PND / ODS ----------------------------------------------------------
  for (const [numero, nombre] of Object.entries(PILARES)) {
    await prisma.pndPilar.upsert({
      where: { numero: Number(numero) },
      update: { nombre },
      create: { numero: Number(numero), nombre },
    });
  }
  for (const p of PND) {
    const pilar = await prisma.pndPilar.findUniqueOrThrow({ where: { numero: p.pilar } });
    await prisma.pndObjetivo.upsert({
      where: { codigo: p.codigo },
      update: { nombre: p.nombre, pilarId: pilar.id },
      create: { codigo: p.codigo, nombre: p.nombre, pilarId: pilar.id },
    });
  }
  await prisma.ods.upsert({
    where: { numero: 16 },
    update: {},
    create: { numero: 16, nombre: "Paz, justicia e instituciones sólidas" },
  });

  // ---- Objetivos + vínculos PND/ODS ---------------------------------------
  const objetivos = cargarObjetivos();
  for (const oe of objetivos) {
    await prisma.objetivoEstrategico.upsert({
      where: { codigo: oe.codigo },
      update: { nombre: oe.nombre },
      create: { id: oe.id, codigo: oe.codigo, nombre: oe.nombre },
    });
    for (const pndCod of oe.pnd) {
      const pnd = await prisma.pndObjetivo.findUniqueOrThrow({ where: { codigo: pndCod } });
      await prisma.oePnd.upsert({
        where: { oeId_pndObjetivoId: { oeId: oe.id, pndObjetivoId: pnd.id } },
        update: {},
        create: { oeId: oe.id, pndObjetivoId: pnd.id },
      });
    }
    for (const odsNum of oe.ods) {
      const ods = await prisma.ods.findUniqueOrThrow({ where: { numero: odsNum } });
      await prisma.oeOds.upsert({
        where: { oeId_odsId: { oeId: oe.id, odsId: ods.id } },
        update: {},
        create: { oeId: oe.id, odsId: ods.id },
      });
    }
  }

  // ---- Acciones Estratégicas (IDs deterministas por orden del dataset) ----
  const acciones = cargarAcciones();
  const aeIdPorCodigo = new Map<string, number>();
  for (let i = 0; i < acciones.length; i++) {
    const ae = acciones[i];
    const id = i + 1;
    await prisma.accionEstrategica.upsert({
      where: { codigo: ae.codigo },
      update: { nombre: ae.nombre, oeId: ae.oe },
      create: { id, codigo: ae.codigo, nombre: ae.nombre, oeId: ae.oe },
    });
    aeIdPorCodigo.set(ae.codigo, id);
  }

  // ---- Dependencias (catálogo alfabético con IDs deterministas) -----------
  const indicadores = cargarIndicadores();
  const nombresDeps = [...new Set(indicadores.flatMap((i) => i.dependencias))].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
  const depIdPorNombre = new Map<string, number>();
  for (let i = 0; i < nombresDeps.length; i++) {
    const nombre = nombresDeps[i];
    const id = i + 1;
    await prisma.dependencia.upsert({
      where: { nombre },
      update: {},
      create: { id, nombre },
    });
    depIdPorNombre.set(nombre, id);
  }

  // ---- Indicadores + Metas + Escalas + Responsables -----------------------
  const indIdPorCodigo = new Map<number, number>();
  for (let i = 0; i < indicadores.length; i++) {
    const ind = indicadores[i];
    const id = i + 1;
    const cicloVida = esCicloVida(ind.metas);
    const concluidos = indicesConcluidos(ind.metas);
    const data = {
      nivel: ind.nivel,
      oeId: ind.oe,
      aeId: ind.ae ? aeIdPorCodigo.get(ind.ae)! : null,
      nombre: ind.nombre,
      descripcion: ind.descripcion,
      variables: ind.variables,
      formula: ind.formula,
      dimension: ind.dimension,
      ambito: ind.ambito,
      unidad: ind.unidad,
      cobertura: "Nacional",
      sentido: ind.sentido,
      lineaBase: ind.lineaBase === null ? null : D(ind.lineaBase),
      anioLineaBase: ind.anioLineaBase,
      basePendiente: ind.lineaBase === null,
      esEscala: !!ind.escala?.length,
      esCicloVida: cicloVida,
      fuenteInfo: ind.fuentes ?? null,
      comentarios: ind.comentarios,
      requiereDiagnostico: CODIGOS_DIAGNOSTICO.has(ind.codigo),
    };
    await prisma.indicador.upsert({
      where: { codigo: ind.codigo },
      update: data,
      create: { id, codigo: ind.codigo, ...data },
    });
    const row = await prisma.indicador.findUniqueOrThrow({ where: { codigo: ind.codigo } });
    indIdPorCodigo.set(ind.codigo, row.id);

    for (let a = 0; a < ANIOS_PEI.length; a++) {
      const anio = ANIOS_PEI[a];
      const valor = ind.metas[a];
      await prisma.meta.upsert({
        where: { indicadorId_anio: { indicadorId: row.id, anio } },
        update: { valorMeta: valor === null ? null : D(valor), esPeriodoConcluido: concluidos.has(a) },
        create: {
          indicadorId: row.id,
          anio,
          valorMeta: valor === null ? null : D(valor),
          esPeriodoConcluido: concluidos.has(a),
        },
      });
    }

    if (ind.escala) {
      let pctMin = 0;
      for (const e of ind.escala) {
        await prisma.escalaIndicador.upsert({
          where: { indicadorId_nivel: { indicadorId: row.id, nivel: e.nivel } },
          update: { descripcion: e.descripcion, pctMin: D(pctMin), pctMax: D(e.pctMax) },
          create: {
            indicadorId: row.id,
            nivel: e.nivel,
            descripcion: e.descripcion,
            pctMin: D(pctMin),
            pctMax: D(e.pctMax),
          },
        });
        pctMin = e.pctMax;
      }
    }

    for (let d = 0; d < ind.dependencias.length; d++) {
      const depId = depIdPorNombre.get(ind.dependencias[d])!;
      const rol: RolResp = d === 0 ? "PRINCIPAL" : "CORRESPONSABLE";
      await prisma.indicadorDependencia.upsert({
        where: {
          indicadorId_dependenciaId_rol: { indicadorId: row.id, dependenciaId: depId, rol },
        },
        update: {},
        create: { indicadorId: row.id, dependenciaId: depId, rol },
      });
    }
  }

  // ---- Riesgos (sin clave natural → recrear) ------------------------------
  await prisma.riesgo.deleteMany({});
  for (const r of cargarRiesgos()) {
    await prisma.riesgo.create({
      data: {
        oeId: r.oe,
        descripcion: r.descripcion,
        probabilidad: r.probabilidad,
        impacto: r.impacto,
        evaluacion: r.evaluacion,
        mitigacion: r.mitigacion,
      },
    });
  }

  // ---- Periodos anuales 2026-2030 -----------------------------------------
  // (numero=null: las claves únicas compuestas con null no admiten upsert →
  //  findFirst + create)
  for (let i = 0; i < ANIOS_PEI.length; i++) {
    const anio = ANIOS_PEI[i];
    const existente = await prisma.periodo.findFirst({
      where: { anio, tipo: "ANUAL", numero: null },
    });
    if (!existente) {
      await prisma.periodo.create({
        data: {
          id: i + 1,
          anio,
          tipo: "ANUAL",
          fechaInicio: new Date(`${anio}-01-01T00:00:00Z`),
          fechaFin: new Date(`${anio}-12-31T23:59:59Z`),
          fechaLimiteCarga: new Date(`${anio + 1}-02-28T23:59:59Z`),
        },
      });
    }
  }

  // ---- Usuarios demo ------------------------------------------------------
  const hash = await bcrypt.hash(PASSWORD_DEMO, 10);
  for (const u of USUARIOS) {
    await prisma.usuario.upsert({
      where: { email: u.email },
      update: { nombre: u.nombre, activo: true },
      create: { id: u.id, nombre: u.nombre, email: u.email, passwordHash: hash, activo: true },
    });
    for (const rol of u.roles) {
      await prisma.usuarioRol.upsert({
        where: { usuarioId_rol: { usuarioId: u.id, rol } },
        update: {},
        create: { usuarioId: u.id, rol },
      });
    }
    for (const depNombre of u.dependencias) {
      const depId = depIdPorNombre.get(depNombre);
      if (!depId) continue;
      await prisma.usuarioDependencia.upsert({
        where: { usuarioId_dependenciaId: { usuarioId: u.id, dependenciaId: depId } },
        update: {},
        create: { usuarioId: u.id, dependenciaId: depId },
      });
    }
  }

  // ---- Mockup (solo test) -------------------------------------------------
  if (SEED_MOCKUP) {
    console.log("Sembrando mediciones mockup (base de prueba)…");
    await prisma.historialEstado.deleteMany({});
    await prisma.validacion.deleteMany({});
    await prisma.evidencia.deleteMany({});
    await prisma.medicion.deleteMany({});

    const mockups: MockupMedicion[] = JSON.parse(
      readFileSync(join(process.cwd(), "prisma", "data", "mockup-mediciones.json"), "utf-8"),
    );
    const periodo2026 = await prisma.periodo.findFirstOrThrow({
      where: { anio: 2026, tipo: "ANUAL", numero: null },
    });
    const cargaPorDep = new Map<number, number>();
    for (const u of USUARIOS) {
      for (const dep of u.dependencias) {
        const depId = depIdPorNombre.get(dep);
        if (depId) cargaPorDep.set(depId, u.id);
      }
    }

    const crearMedicion = async (
      m: MockupMedicion,
      version: number,
      estado: EstadoWF,
      valor: number,
      obs?: string,
      validacionComentario?: string,
    ) => {
      const indId = indIdPorCodigo.get(m.codigo);
      if (!indId) throw new Error(`mockup: indicador ${m.codigo} no existe`);
      const principal = await prisma.indicadorDependencia.findFirstOrThrow({
        where: { indicadorId: indId, rol: "PRINCIPAL" },
      });
      const usuarioCargaId = cargaPorDep.get(principal.dependenciaId) ?? 1;

      const med = await prisma.medicion.create({
        data: {
          indicadorId: indId,
          periodoId: periodo2026.id,
          dependenciaId: principal.dependenciaId,
          numerador: m.numerador !== undefined && version === 1 ? D(m.numerador) : null,
          denominador: m.denominador !== undefined && version === 1 ? D(m.denominador) : null,
          nivelEscala: version === 1 ? (m.nivelEscala ?? null) : null,
          valorObservado: D(valor),
          estado,
          version,
          fuente: m.fuente ?? "Registro administrativo de la dependencia (demo)",
          usuarioCargaId,
          observaciones: obs ?? null,
          fechaCorte: new Date("2026-06-30T00:00:00Z"),
        },
      });

      // Historial coherente con la máquina de estados
      const cadena: EstadoWF[] = ["BORRADOR"];
      if (estado !== "BORRADOR") cadena.push("ENVIADO");
      if (estado === "EN_REVISION" || estado === "OBSERVADO") cadena.push("EN_REVISION");
      if (estado === "OBSERVADO") cadena.push("OBSERVADO");
      if (estado === "APROBADO" || estado === "RECTIFICADO") cadena.push("APROBADO");
      if (estado === "RECHAZADO") cadena.push("RECHAZADO");
      if (estado === "RECTIFICADO") cadena.push("RECTIFICADO");

      let anterior: EstadoWF | null = null;
      for (const e of cadena) {
        const esValidacion = ["EN_REVISION", "APROBADO", "OBSERVADO", "RECHAZADO", "RECTIFICADO"].includes(e);
        await prisma.historialEstado.create({
          data: {
            medicionId: med.id,
            estadoAnterior: anterior,
            estadoNuevo: e,
            usuarioId: esValidacion ? 2 : usuarioCargaId,
            comentario: e === estado && validacionComentario ? validacionComentario : null,
          },
        });
        anterior = e;
      }

      if (["APROBADO", "RECTIFICADO"].includes(estado)) {
        await prisma.validacion.create({
          data: { medicionId: med.id, usuarioId: 2, resultado: "APROBADO", comentario: validacionComentario ?? null },
        });
        await prisma.evidencia.create({
          data: {
            medicionId: med.id,
            nombreArchivo: `informe-${m.codigo}-2026.pdf`,
            tipo: "application/pdf",
            rutaOUrl: `nas://evidencias/2026/${m.codigo}/informe-${m.codigo}-2026.pdf`,
            usuarioId: usuarioCargaId,
            estado: "cargada",
          },
        });
      } else if (estado === "OBSERVADO") {
        await prisma.validacion.create({
          data: { medicionId: med.id, usuarioId: 2, resultado: "OBSERVADO", comentario: validacionComentario ?? null },
        });
      } else if (estado === "RECHAZADO") {
        await prisma.validacion.create({
          data: { medicionId: med.id, usuarioId: 2, resultado: "RECHAZADO", comentario: validacionComentario ?? null },
        });
      }
      return med;
    };

    for (const m of mockups) {
      if (m.estado === "RECTIFICADO" && m.rectificadaPor) {
        await crearMedicion(m, 1, "RECTIFICADO", m.valor, m.obs, "Rectificada por nueva versión.");
        await crearMedicion(
          m,
          2,
          "APROBADO",
          m.rectificadaPor.valor,
          m.rectificadaPor.obs,
          m.rectificadaPor.validacion,
        );
      } else {
        await crearMedicion(m, 1, m.estado, m.valor, m.obs, m.validacion);
      }
    }
  }

  // ---- Verificación final -------------------------------------------------
  const [nOE, nAE, nInd, nMetas, nDeps, nResp, nEsc, nMed] = await Promise.all([
    prisma.objetivoEstrategico.count(),
    prisma.accionEstrategica.count(),
    prisma.indicador.count(),
    prisma.meta.count(),
    prisma.dependencia.count(),
    prisma.indicadorDependencia.count(),
    prisma.escalaIndicador.count(),
    prisma.medicion.count(),
  ]);
  console.log(
    `\nOK · OE: ${nOE} · AE: ${nAE} · Indicadores: ${nInd} · Metas: ${nMetas} · Dependencias: ${nDeps} · Responsabilidades: ${nResp} · Niveles de escala: ${nEsc} · Mediciones: ${nMed}`,
  );
  if (nInd !== 89) throw new Error(`Se esperaban 89 indicadores y hay ${nInd}`);
  if (nAE !== 39) throw new Error(`Se esperaban 39 AE y hay ${nAE}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
