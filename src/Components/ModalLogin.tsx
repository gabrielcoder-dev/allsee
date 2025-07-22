'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from '@supabase/supabase-js'
import { User } from "lucide-react"

// Configure seu Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function ModalLogin({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleGoogleLogin = async () => {
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: "https://allsee-pi.vercel.app/results"
        }
      })
      if (error) {
        setError(error.message)
        setLoading(false)
      }
      // O redirecionamento será feito automaticamente pelo Supabase
    } catch (err: any) {
      setError(err.message || "Erro ao autenticar com Google.")
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-8 shadow-lg w-96 max-w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-6 text-center">
          Entrar com Google
        </h2>
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex items-center justify-center gap-3 bg-red-600 text-white rounded-full py-3 font-semibold mt-2 cursor-pointer hover:bg-red-500 transition disabled:opacity-60 w-full"
        >
          <User />
          {loading ? "Entrando..." : "Entrar com Google"}
        </button>
        {error && (
          <div className="text-red-600 text-sm mt-4 text-center">{error}</div>
        )}
      </div>
    </div>
  )
}
