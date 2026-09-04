/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permitir accesos desde la red local (probar en celular con el mismo WiFi)
  allowedDevOrigins: ['192.168.1.43'],
};

export default nextConfig;
