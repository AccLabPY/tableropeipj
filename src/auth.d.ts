import type { DefaultSession } from "next-auth";
import type { RolUsuario } from "@/domain/types";
import type { Tema } from "@/shared/tema";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roles: RolUsuario[];
      dependenciaIds: number[];
      tema: Tema;
    } & DefaultSession["user"];
  }
  interface User {
    roles: RolUsuario[];
    dependenciaIds: number[];
    tema: Tema;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    roles?: RolUsuario[];
    dependenciaIds?: number[];
    tema?: Tema;
  }
}
