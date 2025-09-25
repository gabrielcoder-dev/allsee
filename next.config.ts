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
  experimental: {
    serverComponentsExternalPackages: [],
  },
  // Configurações de API - aumentar limite global
  serverRuntimeConfig: {
    maxFileSize: '1.5gb',
  },
  // Configurações específicas para API routes
  api: {
    bodyParser: {
      sizeLimit: '1.5gb',
    },
    responseLimit: '1.5gb',
  },
};

export default nextConfig;
