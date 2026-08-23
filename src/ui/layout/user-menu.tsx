import { logoutAction } from "@/server/auth/actions";
import { ROL_LABEL } from "@/shared/constants";
import type { RolUsuario } from "@/domain/types";

/** Chip de usuario + botón salir en el AppBar (server component). */
export function UserMenu({
  nombre,
  roles,
}: {
  nombre: string;
  roles: RolUsuario[];
}) {
  return (
    <div className="flex flex-none items-center gap-3">
      <div className="hidden text-right leading-tight sm:block">
        <div className="max-w-[180px] truncate text-[12px] font-semibold text-white">
          {nombre}
        </div>
        <div className="max-w-[180px] truncate text-[10px] text-on-marca">
          {roles.map((r) => ROL_LABEL[r]).join(" · ")}
        </div>
      </div>
      <form action={logoutAction}>
        <button
          type="submit"
          className="whitespace-nowrap rounded-pj-sm border border-white/[.18] bg-white/10 px-[10px] py-[6px] text-[11px] text-white hover:bg-white/20"
        >
          Salir
        </button>
      </form>
    </div>
  );
}
