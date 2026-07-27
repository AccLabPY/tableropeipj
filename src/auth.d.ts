import type { DefaultSession } from "next-auth";
import type { RolUsuario } from "@/domain/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roles: RolUsuario[];
      dependenciaIds: number[];
    } & DefaultSession["user"];
  }
  interface User {
    roles: RolUsuario[];
    dependenciaIds: number[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    roles?: RolUsuario[];
    dependenciaIds?: number[];
  }
}
