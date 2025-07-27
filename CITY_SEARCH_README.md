# Funcionalidade de Busca de Cidades no Mapa

## Tecnologias Utilizadas

Para implementar a busca de cidades e navegação no mapa, utilizei:

1. **Nominatim (OpenStreetMap)** - API gratuita de geocodificação
2. **React Leaflet** - Biblioteca React para mapas (já estava no projeto)
3. **TypeScript** - Para tipagem estática

## Como Funciona

### 1. Geocodificação
A função `geocodeCity` faz uma requisição para a API do Nominatim:
```typescript
async function geocodeCity(cityName: string): Promise<{ lat: number; lng: number } | null> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1&addressdetails=1`
  )
  const data = await response.json()
  if (data && data.length > 0) {
    return { 
      lat: parseFloat(data[0].lat), 
      lng: parseFloat(data[0].lon) 
    }
  }
  return null
}
```

### 2. Componente de Busca
O componente `CitySearch` oferece:
- Campo de input para digitar o nome da cidade
- Botão de busca
- Tratamento de erros
- Loading state
- Navegação automática no mapa

### 3. Integração com o Mapa
O componente usa o hook `useMap` do React Leaflet para:
- Acessar a instância do mapa
- Navegar para as coordenadas encontradas
- Ajustar o zoom automaticamente

## Como Usar

1. **Digite o nome da cidade** no campo de busca
2. **Pressione Enter** ou clique em "Buscar"
3. **O mapa navegará automaticamente** para a cidade encontrada

## Exemplos de Cidades para Testar

- São Paulo, SP
- Rio de Janeiro, RJ
- Brasília, DF
- Belo Horizonte, MG
- Salvador, BA
- Fortaleza, CE
- Curitiba, PR
- Recife, PE

## Vantagens da Solução

✅ **Gratuita** - Usa API do OpenStreetMap sem custos
✅ **Sem dependências extras** - Usa apenas o que já estava no projeto
✅ **Funciona globalmente** - Busca cidades de qualquer país
✅ **Interface intuitiva** - Campo de busca simples e responsivo
✅ **Tratamento de erros** - Mensagens claras quando cidade não é encontrada

## Alternativas de APIs (se quiser trocar no futuro)

1. **Google Maps Geocoding API** - Mais precisa, mas paga
2. **Mapbox Geocoding API** - Boa precisão, tem plano gratuito
3. **Here Geocoding API** - Boa precisão, tem plano gratuito
4. **Bing Maps Geocoding API** - Boa precisão, tem plano gratuito

## Arquivos Modificados

- `src/Components/CitySearch.tsx` - Novo componente de busca
- `src/Components/MapboxClient.tsx` - Integração do componente de busca

## Testando

Para testar a funcionalidade:

1. Execute o projeto: `npm run dev`
2. Acesse a página com o mapa
3. Digite o nome de uma cidade no campo de busca
4. Veja o mapa navegar automaticamente para a cidade

A funcionalidade está pronta para uso! 🚀 