import type { NextConfig } from "next";
import path from "path";

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
  // Otimizações para uploads rápidos
  compress: true,
  poweredByHeader: false,
  // Fix para warning de lockfiles múltiplos
  outputFileTracingRoot: path.resolve(process.cwd()),
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
      {
        source: '/api/admin/upload-chunk',
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
