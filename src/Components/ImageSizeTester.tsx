"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ImageSizeTester() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const analyzeFile = async (file: File) => {
    setLoading(true);
    setResults([]);
    
    const info: any = {
      name: file.name,
      size: file.size,
      sizeMB: (file.size / 1024 / 1024).toFixed(2),
      type: file.type,
      lastModified: new Date(file.lastModified).toLocaleString()
    };

    // Verificar se é uma imagem
    if (!file.type.startsWith('image/')) {
      setResults(['❌ Arquivo não é uma imagem válida']);
      setFileInfo(info);
      setLoading(false);
      return;
    }

    // Verificar tamanho
    if (file.size > 10 * 1024 * 1024) {
      setResults(['❌ Arquivo muito grande (> 10MB)']);
      setFileInfo(info);
      setLoading(false);
      return;
    }

    if (file.size < 1024) {
      setResults(['❌ Arquivo muito pequeno (< 1KB)']);
      setFileInfo(info);
      setLoading(false);
      return;
    }

    // Verificar dimensões
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      await new Promise((resolve, reject) => {
        img.onload = () => {
          info.width = img.width;
          info.height = img.height;
          info.aspectRatio = (img.width / img.height).toFixed(2);
          
          const results: string[] = [];
          results.push(`✅ Arquivo analisado com sucesso`);
          results.push(`📏 Tamanho: ${info.sizeMB} MB`);
          results.push(`📐 Dimensões: ${img.width} x ${img.height} pixels`);
          results.push(`📊 Proporção: ${info.aspectRatio}`);
          
          // Verificar se as dimensões são adequadas
          if (img.width > 4000 || img.height > 4000) {
            results.push(`⚠️ Imagem muito grande, pode causar problemas`);
          }
          
          if (img.width < 100 || img.height < 100) {
            results.push(`⚠️ Imagem muito pequena, pode ficar pixelada`);
          }
          
          if (img.width > 2000 || img.height > 2000) {
            results.push(`💡 Recomendação: Redimensione para menos de 2000px`);
          }
          
          setResults(results);
          URL.revokeObjectURL(objectUrl);
          resolve(null);
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Erro ao carregar imagem'));
        };
        
        img.src = objectUrl;
      });
    } catch (error) {
      setResults([`❌ Erro ao analisar imagem: ${error}`]);
    }

    setFileInfo(info);
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      analyzeFile(file);
    }
  };

  const testUpload = async () => {
    if (!selectedFile) return;
    
    setLoading(true);
    setResults([]);
    
    try {
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `test-${Date.now()}.${fileExt}`;
      
      console.log('🧪 Testando upload de:', fileName);
      
      // Verificar bucket
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      if (bucketsError) {
        setResults([`❌ Erro ao listar buckets: ${bucketsError.message}`]);
        return;
      }
      
      const anunciosBucket = buckets?.find(bucket => bucket.name === 'anuncios');
      if (!anunciosBucket) {
        setResults([`❌ Bucket 'anuncios' não encontrado`]);
        return;
      }
      
      setResults(prev => [...prev, `✅ Bucket encontrado: ${anunciosBucket.name}`]);
      
      // Fazer upload
      const { data, error } = await supabase.storage
        .from("anuncios")
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        setResults(prev => [...prev, `❌ Erro no upload: ${error.message}`]);
        return;
      }
      
      setResults(prev => [...prev, `✅ Upload bem-sucedido`]);
      
      // Gerar URL
      const { data: urlData } = supabase.storage
        .from("anuncios")
        .getPublicUrl(fileName);
      
      setResults(prev => [...prev, `🔗 URL gerada: ${urlData.publicUrl}`]);
      
      // Testar acesso
      try {
        const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
        if (response.ok) {
          setResults(prev => [...prev, `✅ URL acessível (${response.status})`]);
        } else {
          setResults(prev => [...prev, `❌ URL não acessível (${response.status})`]);
        }
      } catch (fetchError) {
        setResults(prev => [...prev, `❌ Erro ao testar URL: ${fetchError}`]);
      }
      
    } catch (error) {
      setResults(prev => [...prev, `❌ Erro geral: ${error}`]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">📏 Testador de Tamanho de Imagem</h2>
      
      <div className="mb-4">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="border rounded px-3 py-2 w-full"
        />
      </div>
      
      {selectedFile && (
        <div className="mb-4">
          <button
            onClick={testUpload}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? 'Testando...' : '🧪 Testar Upload'}
          </button>
        </div>
      )}
      
      {fileInfo && (
        <div className="bg-gray-100 p-4 rounded-lg mb-4">
          <h3 className="font-bold mb-2">📋 Informações do Arquivo:</h3>
          <div className="text-sm space-y-1">
            <div><strong>Nome:</strong> {fileInfo.name}</div>
            <div><strong>Tamanho:</strong> {fileInfo.sizeMB} MB ({fileInfo.size} bytes)</div>
            <div><strong>Tipo:</strong> {fileInfo.type}</div>
            <div><strong>Modificado:</strong> {fileInfo.lastModified}</div>
            {fileInfo.width && (
              <>
                <div><strong>Largura:</strong> {fileInfo.width}px</div>
                <div><strong>Altura:</strong> {fileInfo.height}px</div>
                <div><strong>Proporção:</strong> {fileInfo.aspectRatio}</div>
              </>
            )}
          </div>
        </div>
      )}
      
      {results.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-bold mb-2">📊 Resultados:</h3>
          <div className="space-y-1">
            {results.map((result, index) => (
              <div key={index} className="text-sm">{result}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 