import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useUserRole() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Buscar o role do usuário na tabela profiles
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('Erro ao buscar role do usuário:', error);
            setUserRole(null);
            setIsAdmin(false);
          } else {
            setUserRole(profile?.role || null);
            setIsAdmin(profile?.role === 'admin');
          }
        } else {
          setUserRole(null);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Erro ao verificar role do usuário:', error);
        setUserRole(null);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserRole();

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        checkUserRole();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { userRole, isAdmin, isLoading };
}
