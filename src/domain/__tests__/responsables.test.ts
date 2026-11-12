import { describe, expect, it } from "vitest";
import {
  dependenciaPrincipal,
  dependenciasResponsables,
  rolDeDependencias,
  type Responsable,
} from "../responsables";

const R: Responsable[] = [
  { dependenciaId: 10, rol: "PRINCIPAL" },
  { dependenciaId: 20, rol: "CORRESPONSABLE" },
  { dependenciaId: 30, rol: "FUENTE" },
  { dependenciaId: 20, rol: "FUENTE" },
];

describe("responsables de un indicador", () => {
  it("las dependencias de carga son principal y corresponsables, sin fuente", () => {
    expect(dependenciasResponsables(R)).toEqual([10, 20]);
  });

  it("puede pedirse cualquier combinación de roles", () => {
    expect(dependenciasResponsables(R, ["FUENTE"])).toEqual([30, 20]);
  });

  it("el rol devuelto es el de mayor precedencia", () => {
    expect(rolDeDependencias(R, [20])).toBe("CORRESPONSABLE");
    expect(rolDeDependencias(R, [30, 10])).toBe("PRINCIPAL");
    expect(rolDeDependencias(R, [30])).toBe("FUENTE");
    expect(rolDeDependencias(R, [99])).toBeNull();
  });

  it("principal, o el primer responsable si no hay principal", () => {
    expect(dependenciaPrincipal(R)).toBe(10);
    expect(dependenciaPrincipal(R.slice(1))).toBe(20);
    expect(dependenciaPrincipal([])).toBeNull();
  });
});
