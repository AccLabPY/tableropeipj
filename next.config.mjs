/** @type {import('next').NextConfig} */
const nextConfig = {
  // Imagen Docker mínima: server.js autocontenido en .next/standalone.
  output: "standalone",
  experimental: {
    // Habilita src/instrumentation.ts: warm-up del caché del PEI al arrancar
    // (evita que el primer visitante pague los round-trips iniciales a la BD).
    instrumentationHook: true,
    serverActions: {
      // Adjuntos de evidencia hasta 25MB (default de Next es 1MB).
      bodySizeLimit: "26mb",
    },
  },
};

export default nextConfig;
