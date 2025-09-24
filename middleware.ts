import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// No middleware do Next.js, não é possível validar o token do Supabase de forma segura (apenas client-side ou backend customizado). 
// Aqui, apenas checamos se o cookie de acesso existe.
export async function middleware(request: NextRequest) {
  console.log('MIDDLEWARE EXECUTED', request.nextUrl.pathname);
  const protectedRoutes = ['/resumo', '/pagamento'];
  const adminRoutes = ['/dashboard'];
  const { pathname } = request.nextUrl;

  // Verificar rotas protegidas (autenticação básica)
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    const access_token = request.cookies.get('sb-access-token')?.value;
    if (!access_token) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Verificar rotas de admin
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    const access_token = request.cookies.get('sb-access-token')?.value;
    if (!access_token) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    // A verificação de role será feita no componente AdminRoute
    // pois o middleware não tem acesso ao banco de dados de forma segura
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/resumo/:path*', '/pagamento/:path*', '/dashboard/:path*'],
};
