// src/Components/ModalLogin.tsx
'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from '@/lib/supabase'
import { X } from "lucide-react"

export default function ModalLogin({ onClose }: { onClose: () => void }) {
  const [loadingRegister, setLoadingRegister] = useState(false)
  const [loadingLogin, setLoadingLogin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Log quando o componente é renderizado
  console.log('🎭 ModalLogin renderizado!')

  const handleGoogleRegister = async () => {
    setError(null)
    setLoadingRegister(true)
    
    console.log('🔐 === INICIANDO CADASTRO COM GOOGLE ===')
    console.log('🌐 URL atual:', window.location.origin)
    console.log('🔧 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('🔧 Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configurado' : 'NÃO CONFIGURADO')
    console.log('🔧 User Agent:', navigator.userAgent)
    
    try {
      console.log('📡 Fazendo chamada para Supabase...')
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/results`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })
      
      console.log('📊 === RESPOSTA DO SUPABASE ===')
      console.log('Data:', data)
      console.log('Error:', error)
      console.log('Data URL:', data?.url)
      console.log('Data Provider:', data?.provider)
      
      if (error) {
        console.error('❌ ERRO NO CADASTRO:', error)
        console.error('❌ Código do erro:', error.status)
        console.error('❌ Mensagem:', error.message)
        setError(`Erro: ${error.message}`)
        setLoadingRegister(false)
      } else if (data?.url) {
        console.log('✅ URL de redirecionamento encontrada:', data.url)
        console.log('🚀 Iniciando redirecionamento...')
        
        // Tentar múltiplas formas de redirecionamento
        try {
          window.location.href = data.url
          console.log('✅ window.location.href executado')
        } catch (redirectError) {
          console.error('❌ Erro no redirecionamento:', redirectError)
          // Fallback
          window.open(data.url, '_self')
        }
      } else {
        console.error('❌ URL de redirecionamento não encontrada na resposta')
        console.log('📊 Estrutura completa da resposta:', JSON.stringify(data, null, 2))
        setError('Erro: URL de redirecionamento não encontrada. Verifique a configuração do Google OAuth.')
        setLoadingRegister(false)
      }
    } catch (err: any) {
      console.error('❌ ERRO INESPERADO:', err)
      console.error('❌ Stack trace:', err.stack)
      setError(`Erro inesperado: ${err.message || "Erro ao autenticar com Google."}`)
      setLoadingRegister(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError(null)
    setLoadingLogin(true)
    
    console.log('🔐 === INICIANDO LOGIN COM GOOGLE ===')
    console.log('🌐 URL atual:', window.location.origin)
    console.log('🔧 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('🔧 Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configurado' : 'NÃO CONFIGURADO')
    console.log('🔧 User Agent:', navigator.userAgent)
    
    try {
      console.log('📡 Fazendo chamada para Supabase...')
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/results`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })
      
      console.log('📊 === RESPOSTA DO SUPABASE ===')
      console.log('Data:', data)
      console.log('Error:', error)
      console.log('Data URL:', data?.url)
      console.log('Data Provider:', data?.provider)
      
      if (error) {
        console.error('❌ ERRO NO LOGIN:', error)
        console.error('❌ Código do erro:', error.status)
        console.error('❌ Mensagem:', error.message)
        setError(`Erro: ${error.message}`)
        setLoadingLogin(false)
      } else if (data?.url) {
        console.log('✅ URL de redirecionamento encontrada:', data.url)
        console.log('🚀 Iniciando redirecionamento...')
        
        // Tentar múltiplas formas de redirecionamento
        try {
          window.location.href = data.url
          console.log('✅ window.location.href executado')
        } catch (redirectError) {
          console.error('❌ Erro no redirecionamento:', redirectError)
          // Fallback
          window.open(data.url, '_self')
        }
      } else {
        console.error('❌ URL de redirecionamento não encontrada na resposta')
        console.log('📊 Estrutura completa da resposta:', JSON.stringify(data, null, 2))
        setError('Erro: URL de redirecionamento não encontrada. Verifique a configuração do Google OAuth.')
        setLoadingLogin(false)
      }
    } catch (err: any) {
      console.error('❌ ERRO INESPERADO:', err)
      console.error('❌ Stack trace:', err.stack)
      setError(`Erro inesperado: ${err.message || "Erro ao autenticar com Google."}`)
      setLoadingLogin(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
        <div
          className="bg-white rounded-md relative flex flex-col p-8 shadow-lg w-96 max-w-full mx-4"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
        <button className="absolute top-3 right-3 cursor-pointer" onClick={onClose}><X className="w-5 text-gray-600 hover:text-black" /></button>
        <h2 className="text-xl font-semibold mb-6 text-center">
         Cadastre ou Entre com Google
        </h2>
        <button
          onClick={(e) => {
            console.log('🖱️ CLIQUE NO BOTÃO CADASTRAR!')
            e.preventDefault();
            e.stopPropagation();
            handleGoogleRegister();
          }}
          disabled={loadingRegister}
          className="flex items-center justify-center gap-3 mb-2 border bg-gray-600 text-white rounded-2xl py-3 font-semibold mt-2 cursor-pointer hover:border-gray-300 hover:bg-transparent hover:text-black transition disabled:opacity-60 w-full"
        >
          <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="30" height="30" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
          </svg>
          {loadingRegister ? "Cadastrando..." : "Cadastrar com Google"}
        </button>
        <button
          onClick={(e) => {
            console.log('🖱️ CLIQUE NO BOTÃO ENTRAR!')
            e.preventDefault();
            e.stopPropagation();
            handleGoogleLogin();
          }}
          disabled={loadingLogin}
          className="flex items-center justify-center gap-3 border border-orange-600 text-black rounded-2xl py-3 font-semibold mt-2 cursor-pointer hover:bg-orange-100 transition disabled:opacity-60 w-full"
        >
          <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="30" height="30" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
          </svg>
          {loadingLogin ? "Entrando..." : "Entrar com Google"}
        </button>
        {error && (
          <div className="text-red-600 text-sm mt-4 text-center">{error}</div>
        )}
      </div>
    </div>
  )
}