import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseServer } from '@/lib/supabaseServer'

// Lista de cidades brasileiras principais (baseada no IBGE)
const brazilianCities = [
  { name: "São Paulo", state: "SP", country: "Brasil", lat: -23.5505, lng: -46.6333 },
  { name: "Rio de Janeiro", state: "RJ", country: "Brasil", lat: -22.9068, lng: -43.1729 },
  { name: "Brasília", state: "DF", country: "Brasil", lat: -15.7801, lng: -47.9292 },
  { name: "Salvador", state: "BA", country: "Brasil", lat: -12.9714, lng: -38.5014 },
  { name: "Fortaleza", state: "CE", country: "Brasil", lat: -3.7172, lng: -38.5434 },
  { name: "Belo Horizonte", state: "MG", country: "Brasil", lat: -19.9167, lng: -43.9345 },
  { name: "Manaus", state: "AM", country: "Brasil", lat: -3.1190, lng: -60.0217 },
  { name: "Curitiba", state: "PR", country: "Brasil", lat: -25.4244, lng: -49.2654 },
  { name: "Recife", state: "PE", country: "Brasil", lat: -8.0476, lng: -34.8770 },
  { name: "Goiânia", state: "GO", country: "Brasil", lat: -16.6864, lng: -49.2643 },
  { name: "Belém", state: "PA", country: "Brasil", lat: -1.4558, lng: -48.5044 },
  { name: "Porto Alegre", state: "RS", country: "Brasil", lat: -30.0346, lng: -51.2177 },
  { name: "Guarulhos", state: "SP", country: "Brasil", lat: -23.4538, lng: -46.5339 },
  { name: "Campinas", state: "SP", country: "Brasil", lat: -22.9056, lng: -47.0608 },
  { name: "São Luís", state: "MA", country: "Brasil", lat: -2.5289, lng: -44.3041 },
  { name: "São Gonçalo", state: "RJ", country: "Brasil", lat: -22.8269, lng: -43.0539 },
  { name: "Maceió", state: "AL", country: "Brasil", lat: -9.6658, lng: -35.7353 },
  { name: "Duque de Caxias", state: "RJ", country: "Brasil", lat: -22.7858, lng: -43.3119 },
  { name: "Natal", state: "RN", country: "Brasil", lat: -5.7945, lng: -35.2110 },
  { name: "Teresina", state: "PI", country: "Brasil", lat: -5.0892, lng: -42.8019 },
  { name: "Campo Grande", state: "MS", country: "Brasil", lat: -20.4697, lng: -54.6201 },
  { name: "Nova Iguaçu", state: "RJ", country: "Brasil", lat: -22.7556, lng: -43.4603 },
  { name: "São Bernardo do Campo", state: "SP", country: "Brasil", lat: -23.6939, lng: -46.5650 },
  { name: "João Pessoa", state: "PB", country: "Brasil", lat: -7.1195, lng: -34.8450 },
  { name: "Santo André", state: "SP", country: "Brasil", lat: -23.6637, lng: -46.5383 },
  { name: "Osasco", state: "SP", country: "Brasil", lat: -23.5325, lng: -46.7919 },
  { name: "Jaboatão dos Guararapes", state: "PE", country: "Brasil", lat: -8.1128, lng: -35.0147 },
  { name: "São José dos Campos", state: "SP", country: "Brasil", lat: -23.1791, lng: -45.8872 },
  { name: "Ribeirão Preto", state: "SP", country: "Brasil", lat: -21.1767, lng: -47.8208 },
  { name: "Uberlândia", state: "MG", country: "Brasil", lat: -18.9126, lng: -48.2755 },
  { name: "Sorocaba", state: "SP", country: "Brasil", lat: -23.5015, lng: -47.4526 },
  { name: "Contagem", state: "MG", country: "Brasil", lat: -19.9167, lng: -44.0833 },
  { name: "Aracaju", state: "SE", country: "Brasil", lat: -10.9472, lng: -37.0731 },
  { name: "Feira de Santana", state: "BA", country: "Brasil", lat: -12.2667, lng: -38.9667 },
  { name: "Cuiabá", state: "MT", country: "Brasil", lat: -15.6014, lng: -56.0979 },
  { name: "Joinville", state: "SC", country: "Brasil", lat: -26.3044, lng: -48.8461 },
  { name: "Aparecida de Goiânia", state: "GO", country: "Brasil", lat: -16.8222, lng: -49.2439 },
  { name: "Londrina", state: "PR", country: "Brasil", lat: -23.3103, lng: -51.1628 },
  { name: "Ananindeua", state: "PA", country: "Brasil", lat: -1.3656, lng: -48.3722 },
  { name: "Serra", state: "ES", country: "Brasil", lat: -20.1286, lng: -40.3078 },
  { name: "Niterói", state: "RJ", country: "Brasil", lat: -22.8833, lng: -43.1036 },
  { name: "Caxias do Sul", state: "RS", country: "Brasil", lat: -29.1678, lng: -51.1794 },
  { name: "Vila Velha", state: "ES", country: "Brasil", lat: -20.3297, lng: -40.2925 },
  { name: "Campos dos Goytacazes", state: "RJ", country: "Brasil", lat: -21.7522, lng: -41.3306 },
  { name: "Macapá", state: "AP", country: "Brasil", lat: 0.0389, lng: -51.0664 },
  { name: "Florianópolis", state: "SC", country: "Brasil", lat: -27.5954, lng: -48.5480 },
  { name: "Diadema", state: "SP", country: "Brasil", lat: -23.6861, lng: -46.6228 },
  { name: "São João de Meriti", state: "RJ", country: "Brasil", lat: -22.8039, lng: -43.3722 },
  { name: "São José do Rio Preto", state: "SP", country: "Brasil", lat: -20.8103, lng: -49.3756 },
  { name: "Mogi das Cruzes", state: "SP", country: "Brasil", lat: -23.5228, lng: -46.1881 },
  { name: "Jundiaí", state: "SP", country: "Brasil", lat: -23.1864, lng: -46.8842 },
  { name: "Carapicuíba", state: "SP", country: "Brasil", lat: -23.5228, lng: -46.8358 },
  { name: "Piracicaba", state: "SP", country: "Brasil", lat: -22.7253, lng: -47.6492 },
  { name: "Bauru", state: "SP", country: "Brasil", lat: -22.3147, lng: -49.0606 },
  { name: "Montes Claros", state: "MG", country: "Brasil", lat: -16.7319, lng: -43.8636 },
  { name: "Itaquaquecetuba", state: "SP", country: "Brasil", lat: -23.4864, lng: -46.3486 },
  { name: "Cariacica", state: "ES", country: "Brasil", lat: -20.2639, lng: -40.4206 },
  { name: "Várzea Grande", state: "MT", country: "Brasil", lat: -15.6469, lng: -56.1325 },
  { name: "Blumenau", state: "SC", country: "Brasil", lat: -26.9194, lng: -49.0661 },
  { name: "Franca", state: "SP", country: "Brasil", lat: -20.5389, lng: -47.4008 },
  { name: "Ponta Grossa", state: "PR", country: "Brasil", lat: -25.0956, lng: -50.1619 },
  { name: "Vitória", state: "ES", country: "Brasil", lat: -20.3155, lng: -40.3128 },
  { name: "Canoas", state: "RS", country: "Brasil", lat: -29.9178, lng: -51.1836 },
  { name: "Petrolina", state: "PE", country: "Brasil", lat: -9.3911, lng: -40.5006 },
  { name: "Uberaba", state: "MG", country: "Brasil", lat: -19.7478, lng: -47.9319 },
  { name: "Paulista", state: "PE", country: "Brasil", lat: -7.9408, lng: -34.8731 },
  { name: "Limeira", state: "SP", country: "Brasil", lat: -22.5647, lng: -47.4017 },
  { name: "Viamão", state: "RS", country: "Brasil", lat: -30.0808, lng: -51.0228 },
  { name: "São Vicente", state: "SP", country: "Brasil", lat: -23.9631, lng: -46.3919 },
  { name: "Caruaru", state: "PE", country: "Brasil", lat: -8.2844, lng: -35.9700 },
  { name: "Ribeirão das Neves", state: "MG", country: "Brasil", lat: -19.7667, lng: -44.0833 },
  { name: "Governador Valadares", state: "MG", country: "Brasil", lat: -18.8511, lng: -41.9494 },
  { name: "Taubaté", state: "SP", country: "Brasil", lat: -23.0264, lng: -45.5556 },
  { name: "Petrópolis", state: "RJ", country: "Brasil", lat: -22.5050, lng: -43.1789 },
  { name: "Suzano", state: "SP", country: "Brasil", lat: -23.5428, lng: -46.3108 },
  { name: "Volta Redonda", state: "RJ", country: "Brasil", lat: -22.5250, lng: -44.1042 },
  { name: "Barueri", state: "SP", country: "Brasil", lat: -23.5111, lng: -46.8764 },
  { name: "Praia Grande", state: "SP", country: "Brasil", lat: -24.0089, lng: -46.4128 },
  { name: "Cascavel", state: "PR", country: "Brasil", lat: -24.9558, lng: -53.4553 },
  { name: "Camaçari", state: "BA", country: "Brasil", lat: -12.6975, lng: -38.3242 },
  { name: "Guarujá", state: "SP", country: "Brasil", lat: -23.9936, lng: -46.2564 },
  { name: "Sumaré", state: "SP", country: "Brasil", lat: -22.8214, lng: -47.2667 },
  { name: "Santa Maria", state: "RS", country: "Brasil", lat: -29.6839, lng: -53.8070 },
  { name: "Taboão da Serra", state: "SP", country: "Brasil", lat: -23.6261, lng: -46.7917 },
  { name: "São José de Ribamar", state: "MA", country: "Brasil", lat: -2.5619, lng: -44.0542 },
  { name: "Marília", state: "SP", country: "Brasil", lat: -22.2139, lng: -49.9458 },
  { name: "Embu das Artes", state: "SP", country: "Brasil", lat: -23.6486, lng: -46.8522 },
  { name: "Foz do Iguaçu", state: "PR", country: "Brasil", lat: -25.5478, lng: -54.5881 },
  { name: "Maringá", state: "PR", country: "Brasil", lat: -23.4253, lng: -51.9389 },
  { name: "São Carlos", state: "SP", country: "Brasil", lat: -22.0175, lng: -47.8908 },
  { name: "Jacareí", state: "SP", country: "Brasil", lat: -23.3053, lng: -45.9658 },
  { name: "Americana", state: "SP", country: "Brasil", lat: -22.7378, lng: -47.3311 },
  { name: "Itabuna", state: "BA", country: "Brasil", lat: -14.7856, lng: -39.2803 },
  { name: "Cotia", state: "SP", country: "Brasil", lat: -23.6022, lng: -46.9192 },
  { name: "São José dos Pinhais", state: "PR", country: "Brasil", lat: -25.5347, lng: -49.2064 },
  { name: "Mauá", state: "SP", country: "Brasil", lat: -23.6678, lng: -46.4611 },
  { name: "Diadema", state: "SP", country: "Brasil", lat: -23.6861, lng: -46.6228 },
  { name: "Imperatriz", state: "MA", country: "Brasil", lat: -5.5256, lng: -47.4917 },
  { name: "Arapiraca", state: "AL", country: "Brasil", lat: -9.7522, lng: -36.6611 },
  { name: "Magé", state: "RJ", country: "Brasil", lat: -22.6528, lng: -43.0408 },
  { name: "São Leopoldo", state: "RS", country: "Brasil", lat: -29.7603, lng: -51.1472 },
  { name: "Rio Branco", state: "AC", country: "Brasil", lat: -9.9756, lng: -67.8242 },
  { name: "Palmas", state: "TO", country: "Brasil", lat: -10.1839, lng: -48.3336 },
  { name: "Boa Vista", state: "RR", country: "Brasil", lat: 2.8195, lng: -60.6719 },
  { name: "Vitória da Conquista", state: "BA", country: "Brasil", lat: -14.8658, lng: -40.8639 },
  { name: "Caucaia", state: "CE", country: "Brasil", lat: -3.7322, lng: -38.6614 },
  { name: "Juiz de Fora", state: "MG", country: "Brasil", lat: -21.7598, lng: -43.3396 },
  { name: "Dourados", state: "MS", country: "Brasil", lat: -22.2208, lng: -54.8058 },
  { name: "Rio Claro", state: "SP", country: "Brasil", lat: -22.4114, lng: -47.5614 },
  { name: "Caxias", state: "MA", country: "Brasil", lat: -4.8589, lng: -43.3561 },
  { name: "Itajaí", state: "SC", country: "Brasil", lat: -26.9078, lng: -48.6619 },
  { name: "Anápolis", state: "GO", country: "Brasil", lat: -16.3264, lng: -48.9528 },
  { name: "Nova Friburgo", state: "RJ", country: "Brasil", lat: -22.2819, lng: -42.5308 },
  { name: "Colombo", state: "PR", country: "Brasil", lat: -25.2925, lng: -49.2261 },
  { name: "Barra Mansa", state: "RJ", country: "Brasil", lat: -22.5442, lng: -44.1714 },
  { name: "Santa Luzia", state: "MG", country: "Brasil", lat: -19.7697, lng: -43.8514 },
  { name: "Cariacica", state: "ES", country: "Brasil", lat: -20.2639, lng: -40.4206 },
  { name: "Cabo Frio", state: "RJ", country: "Brasil", lat: -22.8786, lng: -42.0186 },
  { name: "Angra dos Reis", state: "RJ", country: "Brasil", lat: -23.0069, lng: -44.3181 },
  { name: "Mesquita", state: "RJ", country: "Brasil", lat: -22.7828, lng: -43.4297 },
  { name: "Várzea Paulista", state: "SP", country: "Brasil", lat: -23.2114, lng: -46.8281 },
  { name: "Teresópolis", state: "RJ", country: "Brasil", lat: -22.4119, lng: -42.9658 },
  { name: "Rio Verde", state: "GO", country: "Brasil", lat: -17.7978, lng: -50.9278 },
  { name: "São Caetano do Sul", state: "SP", country: "Brasil", lat: -23.6231, lng: -46.5519 },
  { name: "Parnamirim", state: "RN", country: "Brasil", lat: -5.9158, lng: -35.2631 },
  { name: "Itu", state: "SP", country: "Brasil", lat: -23.2642, lng: -47.2992 },
  { name: "Poços de Caldas", state: "MG", country: "Brasil", lat: -21.7878, lng: -46.5608 },
  { name: "Camaragibe", state: "PE", country: "Brasil", lat: -8.0236, lng: -34.9781 },
  { name: "Cabo de Santo Agostinho", state: "PE", country: "Brasil", lat: -8.2828, lng: -35.0314 },
  { name: "Luziânia", state: "GO", country: "Brasil", lat: -16.2528, lng: -47.9503 },
  { name: "São Mateus", state: "ES", country: "Brasil", lat: -18.7158, lng: -39.8589 },
  { name: "Águas Lindas de Goiás", state: "GO", country: "Brasil", lat: -15.7617, lng: -48.2819 },
  { name: "Valparaíso de Goiás", state: "GO", country: "Brasil", lat: -16.0658, lng: -47.9767 },
  { name: "Trindade", state: "GO", country: "Brasil", lat: -16.6517, lng: -49.4886 },
  { name: "Maracanaú", state: "CE", country: "Brasil", lat: -3.8769, lng: -38.6258 },
  { name: "Formosa", state: "GO", country: "Brasil", lat: -15.5369, lng: -47.3347 },
  { name: "Novo Hamburgo", state: "RS", country: "Brasil", lat: -29.6778, lng: -51.1308 },
  { name: "Sapucaia do Sul", state: "RS", country: "Brasil", lat: -29.8281, lng: -51.1467 },
  { name: "São Francisco do Sul", state: "SC", country: "Brasil", lat: -26.2428, lng: -48.6389 },
  { name: "Santos", state: "SP", country: "Brasil", lat: -23.9618, lng: -46.3322 },
  { name: "Suzano", state: "SP", country: "Brasil", lat: -23.5428, lng: -46.3108 },
  { name: "Rondonópolis", state: "MT", country: "Brasil", lat: -16.4708, lng: -54.6350 },
  { name: "Sete Lagoas", state: "MG", country: "Brasil", lat: -19.4658, lng: -44.2469 },
  { name: "Araraquara", state: "SP", country: "Brasil", lat: -21.7944, lng: -48.1756 },
  { name: "Criciúma", state: "SC", country: "Brasil", lat: -28.6775, lng: -49.3697 },
  { name: "São José do Rio Pardo", state: "SP", country: "Brasil", lat: -21.5958, lng: -46.8889 },
  { name: "Campos dos Goytacazes", state: "RJ", country: "Brasil", lat: -21.7522, lng: -41.3306 },
  { name: "Bragança Paulista", state: "SP", country: "Brasil", lat: -22.9528, lng: -46.5439 },
  { name: "São João da Boa Vista", state: "SP", country: "Brasil", lat: -21.9708, lng: -46.7942 },
  { name: "Tatuí", state: "SP", country: "Brasil", lat: -23.3558, lng: -47.8569 },
  { name: "Catanduva", state: "SP", country: "Brasil", lat: -21.1375, lng: -48.9728 },
  { name: "Bacabal", state: "MA", country: "Brasil", lat: -4.2250, lng: -44.7806 },
  { name: "Pindamonhangaba", state: "SP", country: "Brasil", lat: -22.9244, lng: -45.4617 },
  { name: "Araçatuba", state: "SP", country: "Brasil", lat: -21.2089, lng: -50.4328 },
  { name: "Presidente Prudente", state: "SP", country: "Brasil", lat: -22.1267, lng: -51.3892 },
  { name: "Sertãozinho", state: "SP", country: "Brasil", lat: -21.1378, lng: -47.9903 },
  { name: "Atibaia", state: "SP", country: "Brasil", lat: -23.1172, lng: -46.5503 },
  { name: "Barretos", state: "SP", country: "Brasil", lat: -20.5572, lng: -48.5678 },
  { name: "Mogi Guaçu", state: "SP", country: "Brasil", lat: -22.3717, lng: -46.9439 },
  { name: "Votuporanga", state: "SP", country: "Brasil", lat: -20.4225, lng: -49.9728 },
  { name: "Birigui", state: "SP", country: "Brasil", lat: -21.2892, lng: -50.3400 },
  { name: "Jaboticabal", state: "SP", country: "Brasil", lat: -21.2547, lng: -48.3222 },
  { name: "Assis", state: "SP", country: "Brasil", lat: -22.6619, lng: -50.4122 },
  { name: "Ourinhos", state: "SP", country: "Brasil", lat: -22.9789, lng: -49.8706 },
  { name: "Lins", state: "SP", country: "Brasil", lat: -21.6717, lng: -49.7428 },
  { name: "Botucatu", state: "SP", country: "Brasil", lat: -22.8858, lng: -48.4447 },
  { name: "Itapetininga", state: "SP", country: "Brasil", lat: -23.5917, lng: -48.0531 },
  { name: "Mogi Mirim", state: "SP", country: "Brasil", lat: -22.4319, lng: -46.9578 },
  { name: "São Roque", state: "SP", country: "Brasil", lat: -23.5289, lng: -47.1353 },
  { name: "Hortolândia", state: "SP", country: "Brasil", lat: -22.8583, lng: -47.2200 },
  { name: "Várzea Grande", state: "MT", country: "Brasil", lat: -15.6469, lng: -56.1325 },
  { name: "Guaratinguetá", state: "SP", country: "Brasil", lat: -22.8167, lng: -45.2278 },
  { name: "Araçatuba", state: "SP", country: "Brasil", lat: -21.2089, lng: -50.4328 },
  { name: "Indaiatuba", state: "SP", country: "Brasil", lat: -23.0906, lng: -47.2139 },
  { name: "São João del Rei", state: "MG", country: "Brasil", lat: -21.1356, lng: -44.2617 },
  { name: "Barbacena", state: "MG", country: "Brasil", lat: -21.2258, lng: -43.7739 },
  { name: "Conselheiro Lafaiete", state: "MG", country: "Brasil", lat: -20.6589, lng: -43.7861 },
  { name: "Varginha", state: "MG", country: "Brasil", lat: -21.5558, lng: -45.4303 },
  { name: "Betim", state: "MG", country: "Brasil", lat: -19.9678, lng: -44.1983 },
  { name: "Ipatinga", state: "MG", country: "Brasil", lat: -19.4703, lng: -42.5378 },
  { name: "Divinópolis", state: "MG", country: "Brasil", lat: -20.1389, lng: -44.8839 },
  { name: "Sete Lagoas", state: "MG", country: "Brasil", lat: -19.4658, lng: -44.2469 },
  { name: "Contagem", state: "MG", country: "Brasil", lat: -19.9167, lng: -44.0833 },
  { name: "Poços de Caldas", state: "MG", country: "Brasil", lat: -21.7878, lng: -46.5608 },
  { name: "Pouso Alegre", state: "MG", country: "Brasil", lat: -22.2300, lng: -45.9339 },
  { name: "Patos de Minas", state: "MG", country: "Brasil", lat: -18.5778, lng: -46.5181 },
  { name: "Uberaba", state: "MG", country: "Brasil", lat: -19.7478, lng: -47.9319 },
  { name: "Araguari", state: "MG", country: "Brasil", lat: -18.6472, lng: -48.1872 },
  { name: "Ituiutaba", state: "MG", country: "Brasil", lat: -18.9714, lng: -49.4653 },
  { name: "Itaúna", state: "MG", country: "Brasil", lat: -20.0753, lng: -44.5764 },
  { name: "Passos", state: "MG", country: "Brasil", lat: -20.7192, lng: -46.6097 },
  { name: "Lavras", state: "MG", country: "Brasil", lat: -21.2453, lng: -45.0003 },
  { name: "Araxá", state: "MG", country: "Brasil", lat: -19.5936, lng: -46.9406 },
  { name: "Caratinga", state: "MG", country: "Brasil", lat: -19.7894, lng: -42.1392 },
  { name: "Teófilo Otoni", state: "MG", country: "Brasil", lat: -17.8581, lng: -41.5056 },
  { name: "Alfenas", state: "MG", country: "Brasil", lat: -21.4261, lng: -45.9478 },
  { name: "Vespasiano", state: "MG", country: "Brasil", lat: -19.6917, lng: -43.9233 },
  { name: "Ibirité", state: "MG", country: "Brasil", lat: -20.0219, lng: -44.0589 },
  { name: "Nova Serrana", state: "MG", country: "Brasil", lat: -19.8761, lng: -44.9850 },
  { name: "Santa Luzia", state: "MG", country: "Brasil", lat: -19.7697, lng: -43.8514 },
  { name: "Itapecerica", state: "MG", country: "Brasil", lat: -20.4722, lng: -45.1256 },
  { name: "Pirapora", state: "MG", country: "Brasil", lat: -17.3450, lng: -44.9417 },
  { name: "Coronel Fabriciano", state: "MG", country: "Brasil", lat: -19.5186, lng: -42.6289 },
  { name: "Timóteo", state: "MG", country: "Brasil", lat: -19.5811, lng: -42.6442 },
  { name: "Manhuaçu", state: "MG", country: "Brasil", lat: -20.2581, lng: -42.0336 },
  { name: "Aimorés", state: "MG", country: "Brasil", lat: -19.4986, lng: -41.0639 },
  { name: "João Monlevade", state: "MG", country: "Brasil", lat: -19.8081, lng: -43.1739 },
  { name: "Bocaiúva", state: "MG", country: "Brasil", lat: -17.1075, lng: -43.8142 },
  { name: "Curvelo", state: "MG", country: "Brasil", lat: -18.7556, lng: -44.4303 },
  { name: "Diamantina", state: "MG", country: "Brasil", lat: -18.2419, lng: -43.6033 },
  { name: "Guanhães", state: "MG", country: "Brasil", lat: -18.7753, lng: -42.9325 },
  { name: "Nanuque", state: "MG", country: "Brasil", lat: -17.8392, lng: -40.3531 },
  { name: "Almenara", state: "MG", country: "Brasil", lat: -16.1789, lng: -40.6944 },
  { name: "Januária", state: "MG", country: "Brasil", lat: -15.4867, lng: -44.3597 },
  { name: "Montes Claros", state: "MG", country: "Brasil", lat: -16.7319, lng: -43.8636 },
  { name: "Salinas", state: "MG", country: "Brasil", lat: -16.1753, lng: -42.2903 },
  { name: "Araxá", state: "MG", country: "Brasil", lat: -19.5936, lng: -46.9406 },
  { name: "Patrocínio", state: "MG", country: "Brasil", lat: -18.9444, lng: -46.9931 },
  { name: "Uberlândia", state: "MG", country: "Brasil", lat: -18.9126, lng: -48.2755 },
  { name: "Uberaba", state: "MG", country: "Brasil", lat: -19.7478, lng: -47.9319 },
  { name: "Araguari", state: "MG", country: "Brasil", lat: -18.6472, lng: -48.1872 },
  { name: "Ituiutaba", state: "MG", country: "Brasil", lat: -18.9714, lng: -49.4653 },
  { name: "Itaúna", state: "MG", country: "Brasil", lat: -20.0753, lng: -44.5764 },
  { name: "Passos", state: "MG", country: "Brasil", lat: -20.7192, lng: -46.6097 },
  { name: "Lavras", state: "MG", country: "Brasil", lat: -21.2453, lng: -45.0003 },
  { name: "Araxá", state: "MG", country: "Brasil", lat: -19.5936, lng: -46.9406 },
  { name: "Caratinga", state: "MG", country: "Brasil", lat: -19.7894, lng: -42.1392 },
  { name: "Teófilo Otoni", state: "MG", country: "Brasil", lat: -17.8581, lng: -41.5056 },
  { name: "Alfenas", state: "MG", country: "Brasil", lat: -21.4261, lng: -45.9478 },
  { name: "Vespasiano", state: "MG", country: "Brasil", lat: -19.6917, lng: -43.9233 },
  { name: "Ibirité", state: "MG", country: "Brasil", lat: -20.0219, lng: -44.0589 },
  { name: "Nova Serrana", state: "MG", country: "Brasil", lat: -19.8761, lng: -44.9850 },
  { name: "Santa Luzia", state: "MG", country: "Brasil", lat: -19.7697, lng: -43.8514 },
  { name: "Itapecerica", state: "MG", country: "Brasil", lat: -20.4722, lng: -45.1256 },
  { name: "Pirapora", state: "MG", country: "Brasil", lat: -17.3450, lng: -44.9417 },
  { name: "Coronel Fabriciano", state: "MG", country: "Brasil", lat: -19.5186, lng: -42.6289 },
  { name: "Timóteo", state: "MG", country: "Brasil", lat: -19.5811, lng: -42.6442 },
  { name: "Manhuaçu", state: "MG", country: "Brasil", lat: -20.2581, lng: -42.0336 },
  { name: "Aimorés", state: "MG", country: "Brasil", lat: -19.4986, lng: -41.0639 },
  { name: "João Monlevade", state: "MG", country: "Brasil", lat: -19.8081, lng: -43.1739 },
  { name: "Bocaiúva", state: "MG", country: "Brasil", lat: -17.1075, lng: -43.8142 },
  { name: "Curvelo", state: "MG", country: "Brasil", lat: -18.7556, lng: -44.4303 },
  { name: "Diamantina", state: "MG", country: "Brasil", lat: -18.2419, lng: -43.6033 },
  { name: "Guanhães", state: "MG", country: "Brasil", lat: -18.7753, lng: -42.9325 },
  { name: "Nanuque", state: "MG", country: "Brasil", lat: -17.8392, lng: -40.3531 },
  { name: "Almenara", state: "MG", country: "Brasil", lat: -16.1789, lng: -40.6944 },
  { name: "Januária", state: "MG", country: "Brasil", lat: -15.4867, lng: -44.3597 },
  { name: "Montes Claros", state: "MG", country: "Brasil", lat: -16.7319, lng: -43.8636 },
  { name: "Salinas", state: "MG", country: "Brasil", lat: -16.1753, lng: -42.2903 },
  { name: "Araxá", state: "MG", country: "Brasil", lat: -19.5936, lng: -46.9406 },
  { name: "Patrocínio", state: "MG", country: "Brasil", lat: -18.9444, lng: -46.9931 },
  { name: "Primavera do Leste", state: "MT", country: "Brasil", lat: -15.5619, lng: -54.3067 },
  { name: "Praia Grande", state: "SP", country: "Brasil", lat: -24.0089, lng: -46.4128 },
  { name: "Presidente Prudente", state: "SP", country: "Brasil", lat: -22.1267, lng: -51.3892 },
  { name: "Praia do Rosa", state: "SC", country: "Brasil", lat: -28.0167, lng: -48.6167 },
  { name: "Praia do Forte", state: "BA", country: "Brasil", lat: -12.5833, lng: -38.0833 }
]

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { q } = req.query

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter is required' })
    }

    const searchTerm = q.toLowerCase().trim()
    
    if (searchTerm.length < 2) {
      return res.json({ addresses: [] })
    }

    console.log('🔍 Buscando cidades para:', searchTerm)

    // Buscar apenas cidades brasileiras
    const matchingCities = brazilianCities
      .filter(city => 
        city.name.toLowerCase().includes(searchTerm) ||
        city.state.toLowerCase().includes(searchTerm)
      )
      .map(city => ({
        id: `city_${city.name}_${city.state}`,
        name: city.name,
        address: `${city.name}, ${city.state}, ${city.country}`,
        lat: city.lat,
        lng: city.lng,
        type: 'city' as const,
        // Score para ordenação (cidades que começam com o termo têm prioridade)
        score: city.name.toLowerCase().startsWith(searchTerm) ? 100 : 
               city.name.toLowerCase().includes(searchTerm) ? 50 : 10
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10) // Limitar a 10 cidades

    console.log(`✅ Encontradas ${matchingCities.length} cidades para "${searchTerm}"`)

    res.json({ addresses: matchingCities })
  } catch (error) {
    console.error('❌ Erro na API de busca de endereços:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

// Função para calcular relevância do resultado
function calculateRelevanceScore(searchTerm: string, name: string, address: string): number {
  let score = 0
  const searchLower = searchTerm.toLowerCase()
  const nameLower = name.toLowerCase()
  const addressLower = address.toLowerCase()

  // Match exato no nome = score mais alto
  if (nameLower === searchLower) {
    score += 100
  } else if (nameLower.startsWith(searchLower)) {
    score += 80
  } else if (nameLower.includes(searchLower)) {
    score += 60
  }

  // Match exato no endereço
  if (addressLower === searchLower) {
    score += 90
  } else if (addressLower.startsWith(searchLower)) {
    score += 70
  } else if (addressLower.includes(searchLower)) {
    score += 50
  }

  // Bonus para correspondências no início das palavras
  const words = addressLower.split(' ')
  words.forEach(word => {
    if (word.startsWith(searchLower)) {
      score += 10
    }
  })

  return score
}
