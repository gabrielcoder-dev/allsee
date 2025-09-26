# Configuração do Supabase Storage

## 1. Criar o bucket no Supabase

1. Acesse o painel do Supabase
2. Vá em **Storage** no menu lateral
3. Clique em **Create a new bucket**
4. Nome do bucket: `arte-campanhas`
5. Marque como **Public** (para permitir acesso direto aos arquivos)
6. Clique em **Create bucket**

## 2. Configurar políticas de acesso

### Política para upload (INSERT)
```sql
CREATE POLICY "Permitir upload de arte de campanhas" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'arte-campanhas' AND
  auth.role() = 'authenticated'
);
```

### Política para leitura (SELECT)
```sql
CREATE POLICY "Permitir leitura de arte de campanhas" ON storage.objects
FOR SELECT USING (bucket_id = 'arte-campanhas');
```

### Política para atualização (UPDATE)
```sql
CREATE POLICY "Permitir atualização de arte de campanhas" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'arte-campanhas' AND
  auth.role() = 'authenticated'
);
```

### Política para exclusão (DELETE)
```sql
CREATE POLICY "Permitir exclusão de arte de campanhas" ON storage.objects
FOR DELETE USING (
  bucket_id = 'arte-campanhas' AND
  auth.role() = 'authenticated'
);
```

## 3. Configurações do bucket

- **Tamanho máximo**: 1GB por arquivo
- **Tipos permitidos**: 
  - Imagens: JPG, PNG, GIF, WebP
  - Vídeos: MP4, MOV, AVI, WebM
- **Público**: Sim (para acesso direto via URL)
- **Cache**: 1 hora (3600 segundos)

## 4. Como funciona o sistema

1. **Frontend**: Upload direto para Supabase Storage (sem limitações do Next.js)
2. **Banco de dados**: Armazena apenas a URL do arquivo na tabela `arte_campanha`
3. **Acesso**: Arquivos acessíveis via URL pública do Supabase

## 5. Vantagens

- ✅ **Sem erro 413**: Upload direto para Supabase (sem passar pelo Next.js)
- ✅ **Suporte até 1GB**: Limite do Supabase Storage
- ✅ **Performance**: Upload mais rápido
- ✅ **Escalabilidade**: Supabase gerencia o armazenamento
- ✅ **URLs públicas**: Acesso direto aos arquivos
