import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuração para permitir imagens do Supabase Storage
  images: {
    domains: ['tregxyemhuiivnqjrvei.supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
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
  // Otimizações para uploads rápidos
  compress: true,
  poweredByHeader: false,
  // Headers para permitir uploads grandes
  async headers() {
    return [
      {
        source: '/api/admin/criar-arte-campanha',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'POST, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
