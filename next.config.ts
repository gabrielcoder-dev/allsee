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
    // Aumentar o limite de tamanho do body parser
    serverComponentsExternalPackages: [],
  },
  // Configurações de API
  api: {
    bodyParser: {
      sizeLimit: '150mb',
    },
  },
};

export default nextConfig;
