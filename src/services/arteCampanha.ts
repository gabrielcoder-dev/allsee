import { supabase } from '@/lib/supabase'

type TotemArte = { file: File; previewUrl: string }
type ProdutoCarrinho = {
  id: string
  screen_type?: 'standing' | 'down'
}

export type UploadArteResult = {
  anuncioId: string
  storagePath: string | null
  publicUrl: string | null
  apiOk: boolean
  error?: string
}

function buildStoragePath(orderId: string | number, anuncioId: string, file: File) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const uuid = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? (crypto as any).randomUUID()
    : Math.random().toString(36).slice(2)
  return `${orderId}/${anuncioId}/${uuid}.${ext}`
}

export async function uploadArtesDoPedido(params: {
  orderId: number | string
  userId: string
  produtos: ProdutoCarrinho[]
  totensArtes: Record<string, TotemArte>
  bucket?: string
}): Promise<UploadArteResult[]> {
  const { orderId, userId, produtos, totensArtes, bucket = 'arte-campanhas' } = params
  const results: UploadArteResult[] = []

  for (const produto of produtos) {
    const anuncioId = produto.id
    const arte = totensArtes[anuncioId]
    if (!arte) continue

    try {
      const storagePath = buildStoragePath(orderId, anuncioId, arte.file)
      const { data: uploaded, error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(storagePath, arte.file, {
          contentType: arte.file.type,
          upsert: true,
        })

      if (uploadErr) {
        results.push({ anuncioId, storagePath, publicUrl: null, apiOk: false, error: uploadErr.message })
        continue
      }

      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(storagePath)
      const publicUrl = pub?.publicUrl || null

      const resp = await fetch('/api/admin/criar-arte-campanha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_order: orderId,
          id_user: userId,
          id_anuncio: anuncioId,
          caminho_imagem: publicUrl,
          mime_type: arte.file.type,
          screen_type: produto.screen_type ?? null,
          status: 'pendente',
        }),
      })

      const apiOk = resp.ok
      results.push({ anuncioId, storagePath, publicUrl, apiOk, error: apiOk ? undefined : await resp.text() })
    } catch (e: any) {
      results.push({ anuncioId, storagePath: null, publicUrl: null, apiOk: false, error: e?.message || 'erro desconhecido' })
    }
  }

  return results
}


