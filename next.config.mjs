/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Habilita src/instrumentation.ts: warm-up del caché del PEI al arrancar
    // (evita que el primer visitante pague los ~10 round-trips a TiDB).
    instrumentationHook: true,
  },
};

export default nextConfig;
