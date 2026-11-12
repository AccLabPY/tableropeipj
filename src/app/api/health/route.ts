/** Health check del contenedor (docker compose). No toca la base. */
export async function GET() {
  return Response.json({
    status: "ok",
    servicio: "plataforma-pei-2026-2030",
    ts: new Date().toISOString(),
  });
}
