import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rotas protegidas
const protectedRoutes = ['/dashboard']

export function middleware(request: NextRequest) {
  const { cookies, nextUrl } = request

  // O Supabase salva o token de sessão no cookie chamado 'sb-access-token' (ou 'supabase-auth-token' em alguns setups)
  const hasToken =
    cookies.get('sb-access-token') ||
    cookies.get('supabase-auth-token') ||
    cookies.get('sb:token') // tente as variações possíveis

  // Se for rota protegida e não tiver token, redireciona para home
  if (
    protectedRoutes.some((route) => nextUrl.pathname.startsWith(route)) &&
    !hasToken
  ) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Libera acesso normalmente
  return NextResponse.next()
}

// Configuração para rodar o middleware apenas nas rotas desejadas
export const config = {
  matcher: ['/payment/:path*'],
}