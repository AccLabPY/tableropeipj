/**
 * Banner obligatorio cuando el entorno de datos activo es la base de PRUEBA.
 * Se renderiza desde el layout del dashboard para todas las páginas.
 */
export function TestModeBanner() {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 border-b border-[#EAD9AE] bg-sem-ambar-bg px-4 py-[6px] text-[12px] font-semibold text-sem-ambar"
    >
      <span aria-hidden="true">⚠</span>
      MODO PRUEBA — está viendo datos de demostración (base peipj_test). Los
      tableros oficiales usan la base de producción.
    </div>
  );
}
