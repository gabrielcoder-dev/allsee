import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
  // Configurações para lidar com arquivos grandes
  serverExternalPackages: [],
  // Configurações de API - aumentar limite global
  serverRuntimeConfig: {
    maxFileSize: '1.5gb',
  },
};

export default nextConfig;
