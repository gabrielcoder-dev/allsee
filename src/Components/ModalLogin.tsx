'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from '@supabase/supabase-js'

// Configure seu Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function ModalLogin({ onClose }: { onClose: () => void }) {
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (isRegister) {
        // Cadastro
        const { error: signUpError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: { name: form.name }
          }
        })
        if (signUpError) {
          setError(signUpError.message)
        } else {
          onClose()
          router.push('/emailverification')
        }
      } else {
        // Login
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        })
        if (signInError) throw signInError

        onClose()
        router.push('/results')
      }
    } catch (err: any) {
      setError(err.message || "Erro ao autenticar.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-8 shadow-lg w-96"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4 text-center">
          {isRegister ? "Criar Conta" : "Entrar"}
        </h2>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {isRegister && (
            <div className="flex flex-col gap-1">
              <label className="text-left text-sm font-semibold">Nome</label>
              <input
                type="text"
                name="name"
                className="border rounded px-3 border-gray-500 focus:border-orange-600 focus:outline-none focus:ring-0 py-2"
                placeholder="Seu nome"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-left text-sm font-semibold">Email</label>
            <input
              type="email"
              name="email"
              className="border rounded px-3 border-gray-500 focus:border-orange-600 focus:outline-none focus:ring-0 py-2"
              placeholder="Seu email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-left text-sm font-semibold">Senha</label>
            <input
              type="password"
              name="password"
              className="border rounded px-3 border-gray-500 focus:border-orange-600 focus:outline-none focus:ring-0 py-2"
              placeholder="Sua senha"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>
          <button
            type="submit"
            className="bg-orange-600 text-white rounded-full py-2 font-semibold mt-2 cursor-pointer hover:bg-orange-500 transition disabled:opacity-60"
            disabled={loading}
          >
            {loading
              ? (isRegister ? "Criando..." : "Entrando...")
              : (isRegister ? "Criar Conta" : "Entrar")}
          </button>
        </form>
        {error && (
          <div className="text-red-600 text-sm mt-2 text-center">{error}</div>
        )}
        <div className="mt-4 text-center">
          <button
            className="text-orange-600 underline cursor-pointer"
            onClick={() => { setIsRegister(!isRegister); setError(null); }}
            type="button"
          >
            {isRegister
              ? "Já tem uma conta?"
              : "Ainda não tem uma conta?"}
          </button>
        </div>
      </div>
    </div>
  )
}
