"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ImageUrlTester() {
  const [anuncios, setAnuncios] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const testImageUrls = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      // Buscar todos os anúncios
      const { data, error } = await supabase
        .from('anuncios')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        setResults([`❌ Erro ao buscar anúncios: ${error.message}`]);
        return;
      }

      setAnuncios(data || []);
      const testResults: string[] = [];

      for (const anuncio of data || []) {
        testResults.push(`\n🔍 Testando anúncio ${anuncio.id}: "${anuncio.name}"`);
        
        if (!anuncio.image) {
          testResults.push(`❌ Anúncio ${anuncio.id} não tem imagem`);
          continue;
        }

        testResults.push(`📷 URL: ${anuncio.image}`);

        // Verificar se a URL é válida
        if (!anuncio.image.startsWith('https://')) {
          testResults.push(`❌ URL inválida (não começa com https://)`);
          continue;
        }

        if (!anuncio.image.includes('supabase')) {
          testResults.push(`⚠️ URL não parece ser do Supabase`);
        }

        // Testar se a imagem carrega
        try {
          const response = await fetch(anuncio.image, { method: 'HEAD' });
          if (response.ok) {
            testResults.push(`✅ Imagem carrega corretamente (${response.status})`);
          } else {
            testResults.push(`❌ Imagem não carrega (${response.status})`);
          }
        } catch (error) {
          testResults.push(`❌ Erro ao carregar imagem: ${error}`);
        }
      }

      setResults(testResults);
    } catch (error) {
      setResults([`❌ Erro geral: ${error}`]);
    } finally {
      setLoading(false);
    }
  };

  const fixInvalidUrls = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      // Buscar anúncios com URLs inválidas
      const { data, error } = await supabase
        .from('anuncios')
        .select('id, name, image')
        .or('image.is.null,image.eq.,image.not.like.https://%');

      if (error) {
        setResults([`❌ Erro ao buscar anúncios: ${error.message}`]);
        return;
      }

      const fixResults: string[] = [];
      fixResults.push(`🔧 Encontrados ${data?.length || 0} anúncios com URLs inválidas`);

      for (const anuncio of data || []) {
        fixResults.push(`\n📝 Anúncio ${anuncio.id}: "${anuncio.name}"`);
        fixResults.push(`   URL atual: ${anuncio.image || 'NULL'}`);
        
        // Limpar URL inválida
        const { error: updateError } = await supabase
          .from('anuncios')
          .update({ image: null })
          .eq('id', anuncio.id);

        if (updateError) {
          fixResults.push(`   ❌ Erro ao corrigir: ${updateError.message}`);
        } else {
          fixResults.push(`   ✅ URL corrigida (definida como NULL)`);
        }
      }

      setResults(fixResults);
    } catch (error) {
      setResults([`❌ Erro geral: ${error}`]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">🔧 Testador de URLs de Imagens</h2>
      
      <div className="flex gap-2 mb-4">
        <button
          onClick={testImageUrls}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Testando...' : '🧪 Testar URLs'}
        </button>
        
        <button
          onClick={fixInvalidUrls}
          disabled={loading}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Corrigindo...' : '🔧 Corrigir URLs Inválidas'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="font-bold mb-2">📊 Resultados:</h3>
          <pre className="text-sm whitespace-pre-wrap">{results.join('')}</pre>
        </div>
      )}

      {anuncios.length > 0 && (
        <div className="mt-4">
          <h3 className="font-bold mb-2">📋 Últimos Anúncios:</h3>
          <div className="space-y-2">
            {anuncios.map(anuncio => (
              <div key={anuncio.id} className="border p-2 rounded">
                <div className="font-medium">ID: {anuncio.id} - {anuncio.name}</div>
                <div className="text-sm text-gray-600">
                  Imagem: {anuncio.image || 'NULL'}
                </div>
                <div className="text-xs text-gray-500">
                  Criado: {new Date(anuncio.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 