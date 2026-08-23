"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  actualizarUsuarioAction,
  crearUsuarioAction,
  type ResultadoAdmin,
} from "@/server/services/admin-actions";
import { ROLES, ROL_LABEL } from "@/shared/constants";
import type { RolUsuario } from "@/domain/types";
import { Card, CardHeader, Tag } from "@/ui/components/card";
import { DataTable } from "@/ui/components/data-table";
import { Spinner } from "@/ui/components/spinner";
import { ModalResultado } from "@/ui/components/modal-resultado";
import { cn } from "@/lib/utils";

export interface UsuarioAdminDTO {
  id: number;
  nombre: string;
  email: string;
  activo: boolean;
  roles: RolUsuario[];
  dependenciaIds: number[];
}

interface FormUsuario {
  id: number | null;
  nombre: string;
  email: string;
  password: string;
  activo: boolean;
  roles: RolUsuario[];
  dependenciaIds: number[];
}

const VACIO: FormUsuario = {
  id: null,
  nombre: "",
  email: "",
  password: "",
  activo: true,
  roles: ["CONSULTA"],
  dependenciaIds: [],
};

export function UsuariosView({
  usuarios,
  dependencias,
}: {
  usuarios: UsuarioAdminDTO[];
  dependencias: { id: number; nombre: string }[];
}) {
  const [form, setForm] = useState<FormUsuario>(VACIO);
  const [toast, setToast] = useState<ResultadoAdmin | null>(null);
  const [pendiente, start] = useTransition();
  const router = useRouter();

  const editar = (u: UsuarioAdminDTO) => {
    setForm({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      password: "",
      activo: u.activo,
      roles: u.roles,
      dependenciaIds: u.dependenciaIds,
    });
    setToast(null);
  };

  const guardar = () =>
    start(async () => {
      const r =
        form.id === null
          ? await crearUsuarioAction({
              nombre: form.nombre,
              email: form.email,
              password: form.password,
              roles: form.roles,
              dependenciaIds: form.dependenciaIds,
            })
          : await actualizarUsuarioAction({
              id: form.id,
              nombre: form.nombre,
              email: form.email,
              activo: form.activo,
              roles: form.roles,
              dependenciaIds: form.dependenciaIds,
              password: form.password || "",
            });
      setToast(r);
      if (r.ok && form.id === null) setForm(VACIO);
      router.refresh();
    });

  const toggleRol = (rol: RolUsuario) =>
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(rol)
        ? f.roles.filter((r) => r !== rol)
        : [...f.roles, rol],
    }));

  const toggleDep = (id: number) =>
    setForm((f) => ({
      ...f,
      dependenciaIds: f.dependenciaIds.includes(id)
        ? f.dependenciaIds.filter((d) => d !== id)
        : [...f.dependenciaIds, id],
    }));

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader
          title="Usuarios de la plataforma"
          meta="plano de control: no dependen del modo prueba"
        />
        <DataTable
          celdaClassName="px-4 py-[10px]"
          columnas={[
            {
              key: "usuario",
              header: "Usuario",
              movil: "titulo",
              cell: (u) => (
                <>
                  <div className="text-[12.5px] font-semibold">{u.nombre}</div>
                  <div className="text-[11.5px] text-muted">{u.email}</div>
                </>
              ),
            },
            {
              key: "roles",
              header: "Roles",
              movilAncho: true,
              cell: (u) => (
                <div className="flex flex-wrap gap-1">
                  {u.roles.map((r) => (
                    <Tag key={r}>{ROL_LABEL[r]}</Tag>
                  ))}
                </div>
              ),
            },
            {
              key: "dependencias",
              header: "Dependencias",
              movilAncho: true,
              tdClassName: "text-[11.5px] text-muted",
              cell: (u) =>
                u.dependenciaIds.length
                  ? u.dependenciaIds
                      .map(
                        (id) =>
                          dependencias.find((d) => d.id === id)?.nombre ?? id,
                      )
                      .map((n) =>
                        String(n).replace("Dirección General de ", "DG "),
                      )
                      .join(" · ")
                  : "—",
            },
            {
              key: "estado",
              header: "Estado",
              movil: "insignia",
              cell: (u) => (
                <span
                  className={cn(
                    "whitespace-nowrap rounded-chip px-2 py-[2px] text-[10.5px] font-semibold",
                    u.activo
                      ? "bg-sem-verde-bg text-sem-verde-fg"
                      : "bg-sem-rojo-bg text-sem-rojo-fg",
                  )}
                >
                  {u.activo ? "Activo" : "Inactivo"}
                </span>
              ),
            },
            {
              key: "acciones",
              header: <span className="sr-only">Acciones</span>,
              movil: "insignia",
              thClassName: "w-16",
              cell: (u) => (
                <button
                  type="button"
                  onClick={() => editar(u)}
                  className="text-[12px] font-semibold text-azul-d hover:underline"
                >
                  Editar
                </button>
              ),
            },
          ]}
          filas={usuarios}
          keyFila={(u) => u.id}
          vacio="Sin usuarios registrados."
        />
      </Card>

      <Card>
        <CardHeader
          title={form.id === null ? "Nuevo usuario" : `Editar usuario #${form.id}`}
          meta={
            form.id !== null ? (
              <button
                type="button"
                onClick={() => setForm(VACIO)}
                className="text-azul-d hover:underline"
              >
                + nuevo
              </button>
            ) : undefined
          }
        />
        <fieldset disabled={pendiente} className="space-y-3 p-4">
          <label className="block text-2xs uppercase tracking-[.06em] text-muted">
            Nombre completo
            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="mt-1 block w-full rounded-pj border border-linea bg-superficie px-[9px] py-2 text-[12.5px] normal-case tracking-normal text-tinta"
            />
          </label>
          <label className="block text-2xs uppercase tracking-[.06em] text-muted">
            Correo institucional
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 block w-full rounded-pj border border-linea bg-superficie px-[9px] py-2 text-[12.5px] normal-case tracking-normal text-tinta"
            />
          </label>
          <label className="block text-2xs uppercase tracking-[.06em] text-muted">
            {form.id === null ? "Contraseña (mín. 8)" : "Nueva contraseña (opcional)"}
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-1 block w-full rounded-pj border border-linea bg-superficie px-[9px] py-2 text-[12.5px]"
            />
          </label>

          <div>
            <div className="mb-1 text-2xs uppercase tracking-[.06em] text-muted">
              Roles
            </div>
            <div className="space-y-1">
              {ROLES.map((r) => (
                <label key={r} className="flex items-center gap-2 text-[12.5px]">
                  <input
                    type="checkbox"
                    checked={form.roles.includes(r)}
                    onChange={() => toggleRol(r)}
                    className="h-4 w-4 accent-azul"
                  />
                  {ROL_LABEL[r]}
                </label>
              ))}
            </div>
          </div>

          {form.roles.includes("DEPENDENCIA_CARGA") ? (
            <div>
              <div className="mb-1 text-2xs uppercase tracking-[.06em] text-muted">
                Dependencias asignadas (scoping de carga)
              </div>
              <div className="scroll-pj max-h-[180px] space-y-1 overflow-y-auto rounded-pj border border-linea p-2">
                {dependencias.map((d) => (
                  <label
                    key={d.id}
                    className="flex items-center gap-2 text-[12px]"
                  >
                    <input
                      type="checkbox"
                      checked={form.dependenciaIds.includes(d.id)}
                      onChange={() => toggleDep(d.id)}
                      className="h-4 w-4 accent-azul"
                    />
                    {d.nombre}
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {form.id !== null ? (
            <label className="flex items-center gap-2 text-[12.5px]">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                className="h-4 w-4 accent-azul"
              />
              Usuario activo
            </label>
          ) : null}

          <div className="border-t border-linea-2 pt-3">
            <button
              type="button"
              onClick={guardar}
              className="inline-flex items-center gap-2 rounded-pj border border-azul-d bg-azul px-4 py-[9px] text-[12.5px] font-semibold text-white hover:bg-azul-d disabled:opacity-50"
            >
              {pendiente ? <Spinner /> : null}
              {pendiente
                ? "Guardando…"
                : form.id === null
                  ? "Crear usuario"
                  : "Guardar cambios"}
            </button>
          </div>
        </fieldset>
      </Card>

      <ModalResultado
        abierto={toast !== null}
        tipo={toast?.ok ? "exito" : "error"}
        mensaje={toast?.mensaje}
        alCerrar={() => setToast(null)}
      />
    </div>
  );
}
