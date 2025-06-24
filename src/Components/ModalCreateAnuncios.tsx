'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { X } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ModalCreateAnuncios({ open, onClose }: { open: boolean, onClose: () => void }) {
  const [name, setName] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [address, setAddress] = useState('')
  const [screens, setScreens] = useState('')
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!open) return null

  async function handleImageUpload(file: File) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const { data, error } = await supabase.storage
      .from('anuncios')
      .upload(fileName, file)
    if (error) throw error
    const { data: urlData } = supabase
      .storage
      .from('anuncios')
      .getPublicUrl(fileName)
    return urlData.publicUrl
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)
    let imgUrl = imageUrl

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    console.log('Usuário atual:', user)
    console.log('Erro de usuário:', userError)

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('Usuário não autenticado.')
      }

      if (image && !imageUrl) {
        imgUrl = await handleImageUpload(image)
        setImageUrl(imgUrl)
      }

      const { error: insertError } = await supabase
        .from('anuncios')
        .insert([{
          name,
          image: imgUrl,
          address,
          screens: Number(screens),
          price: Number(price),
          duration
        }])

      if (insertError) throw insertError

      setSuccess(true)
      setName('')
      setImage(null)
      setImageUrl('')
      setAddress('')
      setScreens('')
      setPrice('')
      setDuration('')
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar anúncio.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-2 relative">
        <button
          className="absolute top-3 right-3 p-2 rounded hover:bg-gray-100"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold mb-4">Cadastrar anúncio</h2>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <input type="text" placeholder="Nome do anúncio" className="border rounded-lg px-3 py-2" value={name} onChange={e => setName(e.target.value)} required />
          <input type="file" accept="image/*" className="border rounded-lg px-3 py-2" onChange={e => { if (e.target.files && e.target.files[0]) { setImage(e.target.files[0]); setImageUrl('') } }} required />
          <input type="text" placeholder="Endereço" className="border rounded-lg px-3 py-2" value={address} onChange={e => setAddress(e.target.value)} required />
          <input type="number" placeholder="Quantidade de telas" className="border rounded-lg px-3 py-2" value={screens} onChange={e => setScreens(e.target.value)} required min={1} />
          <input type="number" placeholder="Preço (R$)" className="border rounded-lg px-3 py-2" value={price} onChange={e => setPrice(e.target.value)} required min={0} step="0.01" />
          <input type="text" placeholder="Duração (ex: 4 semanas)" className="border rounded-lg px-3 py-2" value={duration} onChange={e => setDuration(e.target.value)} required />
          <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg py-2 mt-2" disabled={loading}>
            {loading ? 'Salvando...' : 'Cadastrar'}
          </button>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">Anúncio cadastrado com sucesso!</div>}
        </form>
      </div>
    </div>
  )
}
