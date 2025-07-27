# Funcionalidade de Busca Automática de Cidades no Mapa

## Tecnologias Utilizadas

Para implementar a busca automática de cidades e navegação no mapa, utilizei:

1. **Nominatim (OpenStreetMap)** - API gratuita de geocodificação
2. **React Leaflet** - Biblioteca React para mapas (já estava no projeto)
3. **TypeScript** - Para tipagem estática
4. **Custom Hook** - Para gerenciar debounce e estado

## Como Funciona

### 1. Hook Personalizado (`useCitySearch`)
O hook gerencia a busca automática com debounce de 2 segundos:
```typescript
export function useCitySearch(delay: number = 2000) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [lastResult, setLastResult] = useState<CitySearchResult | null>(null)
  const [error, setError] = useState('')
  
  // Debounce effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        searchCity(searchTerm)
      }
    }, delay)
    
    return () => clearTimeout(timeoutId)
  }, [searchTerm, delay, searchCity])
}
```

### 2. Geocodificação
A função `geocodeCity` faz uma requisição para a API do Nominatim:
```typescript
async function geocodeCity(cityName: string): Promise<CitySearchResult | null> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1&addressdetails=1`
  )
  const data = await response.json()
  if (data && data.length > 0) {
    return { 
      lat: parseFloat(data[0].lat), 
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name
    }
  }
  return null
}
```

### 3. Integração com Headers Existentes
Os inputs existentes nos headers (Desktop e Mobile) foram integrados com:
- **Debounce automático** - Busca após 2 segundos sem digitar
- **Indicadores visuais** - "Buscando..." e mensagens de erro
- **Navegação automática** - Mapa navega para a cidade encontrada

## Como Usar

1. **Digite o nome da cidade** no campo "Endereço ou região" (Desktop ou Mobile)
2. **Aguarde 2 segundos** sem digitar
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
- Goiânia, GO
- Manaus, AM

## Vantagens da Solução

✅ **Busca automática** - Não precisa clicar em botão  
✅ **Debounce inteligente** - Evita requisições desnecessárias  
✅ **Integração nativa** - Usa os inputs existentes  
✅ **Gratuita** - Usa API do OpenStreetMap sem custos  
✅ **Sem dependências extras** - Usa apenas o que já estava no projeto  
✅ **Funciona globalmente** - Busca cidades de qualquer país  
✅ **Interface intuitiva** - Indicadores visuais de status  
✅ **Tratamento de erros** - Mensagens claras quando cidade não é encontrada  

## Alternativas de APIs (se quiser trocar no futuro)

1. **Google Maps Geocoding API** - Mais precisa, mas paga
2. **Mapbox Geocoding API** - Boa precisão, tem plano gratuito
3. **Here Geocoding API** - Boa precisão, tem plano gratuito
4. **Bing Maps Geocoding API** - Boa precisão, tem plano gratuito

## Arquivos Modificados

- `src/hooks/useCitySearch.ts` - Hook personalizado para busca automática
- `src/Components/HeaderResultsDesktop.tsx` - Integração do hook
- `src/Components/HeaderResultsMobile.tsx` - Integração do hook
- `src/Components/MapboxClient.tsx` - Função de navegação no mapa
- `src/app/(public)/results/page.tsx` - Callbacks de integração

## Testando

Para testar a funcionalidade:

1. Execute o projeto: `npm run dev`
2. Acesse a página `/results`
3. Digite o nome de uma cidade no campo "Endereço ou região"
4. Aguarde 2 segundos sem digitar
5. Veja o mapa navegar automaticamente para a cidade

## Funcionalidades

- **Busca automática** após 2 segundos sem digitar
- **Indicador visual** "Buscando..." durante a busca
- **Mensagens de erro** quando cidade não é encontrada
- **Navegação automática** no mapa para a cidade encontrada
- **Funciona em Desktop e Mobile** usando os inputs existentes

A funcionalidade está pronta para uso! 🚀 