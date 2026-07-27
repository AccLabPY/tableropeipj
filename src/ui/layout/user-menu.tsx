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
    <div className="flex items-center gap-3">
      <div className="text-right leading-tight">
        <div className="text-[12px] font-semibold text-white">{nombre}</div>
        <div className="text-[10px] text-[#B8CADA]">
          {roles.map((r) => ROL_LABEL[r]).join(" · ")}
        </div>
      </div>
      <form action={logoutAction}>
        <button
          type="submit"
          className="rounded-pj-sm border border-white/[.18] bg-white/10 px-[10px] py-1 text-[11px] text-white hover:bg-white/20"
        >
          Salir
        </button>
      </form>
    </div>
  );
}
