'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserRole } from '@/hooks/useUserRole';
import DashboardPage from '@/Components/DashboardPage';

export default function Dashboard() {
  const { isAdmin, isLoading } = useUserRole();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      // Redirecionar para a página inicial se não for admin
      router.push('/');
    }
  }, [isAdmin, isLoading, router]);

  // Mostrar loading enquanto verifica o role
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Se não for admin, não renderizar nada (o redirecionamento já foi feito)
  if (!isAdmin) {
    return null;
  }

  // Se for admin, renderizar o dashboard
  return <DashboardPage />;
}
