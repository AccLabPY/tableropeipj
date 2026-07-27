/** Health check para Render/monitoreo. No toca la base (warm-up barato). */
export async function GET() {
  return Response.json({
    status: "ok",
    servicio: "plataforma-pei-2026-2030",
    ts: new Date().toISOString(),
  });
}
