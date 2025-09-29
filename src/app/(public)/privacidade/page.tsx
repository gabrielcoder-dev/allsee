import React from 'react'
import HeaderPolTerm from '@/Components/HeaderPolTerm'
import Footer from '@/Components/Footer'

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen  bg-gray-50">
      <HeaderPolTerm />
      
      <div className="max-w-4xl mx-auto px-4 py-12 pt-24">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Política de Privacidade
            </h1>
            <p className="text-lg text-gray-600">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1. Informações Gerais
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                A AllSee ("nós", "nosso" ou "empresa") respeita sua privacidade e está comprometida 
                em proteger suas informações pessoais. Esta Política de Privacidade descreve como 
                coletamos, usamos, armazenamos e protegemos suas informações quando você utiliza 
                nossa plataforma de publicidade digital.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                2. Informações que Coletamos
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-medium text-gray-800 mb-2">
                    2.1 Informações Pessoais
                  </h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-2">
                    <li>Nome completo e dados de contato</li>
                    <li>Endereço de e-mail e telefone</li>
                    <li>Informações de pagamento (processadas de forma segura)</li>
                    <li>Dados de cadastro da empresa</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium text-gray-800 mb-2">
                    2.2 Informações de Uso
                  </h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-2">
                    <li>Dados de navegação e interação com a plataforma</li>
                    <li>Localização geográfica para direcionamento de anúncios</li>
                    <li>Preferências e configurações de conta</li>
                    <li>Logs de acesso e atividades</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                3. Como Utilizamos suas Informações
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">
                    Serviços Principais
                  </h3>
                  <ul className="text-blue-800 space-y-2">
                    <li>• Criação e gestão de campanhas publicitárias</li>
                    <li>• Processamento de pagamentos</li>
                    <li>• Suporte ao cliente</li>
                    <li>• Comunicação sobre serviços</li>
                  </ul>
                </div>
                
                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-900 mb-3">
                    Melhorias e Análises
                  </h3>
                  <ul className="text-green-800 space-y-2">
                    <li>• Análise de performance das campanhas</li>
                    <li>• Desenvolvimento de novos recursos</li>
                    <li>• Personalização da experiência</li>
                    <li>• Relatórios estatísticos</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                4. Compartilhamento de Informações
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros, 
                exceto nas seguintes situações:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li><strong>Prestadores de serviços:</strong> Parceiros confiáveis que nos auxiliam na operação da plataforma</li>
                <li><strong>Obrigações legais:</strong> Quando exigido por lei ou autoridades competentes</li>
                <li><strong>Proteção de direitos:</strong> Para proteger nossos direitos, propriedade ou segurança</li>
                <li><strong>Consentimento:</strong> Quando você autoriza explicitamente o compartilhamento</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                5. Segurança dos Dados
              </h2>
              <div className="bg-gray-100 p-6 rounded-lg">
                <p className="text-gray-700 leading-relaxed mb-4">
                  Implementamos medidas de segurança técnicas e organizacionais para proteger 
                  suas informações contra acesso não autorizado, alteração, divulgação ou destruição:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>Criptografia SSL/TLS para transmissão de dados</li>
                  <li>Armazenamento seguro em servidores protegidos</li>
                  <li>Controle de acesso baseado em funções</li>
                  <li>Monitoramento contínuo de segurança</li>
                  <li>Backup regular e recuperação de dados</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                6. Seus Direitos
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                De acordo com a LGPD (Lei Geral de Proteção de Dados), você tem os seguintes direitos:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-gray-800">Acesso e Correção</h3>
                  <p className="text-gray-600 text-sm">Visualizar e corrigir seus dados pessoais</p>
                </div>
                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="font-semibold text-gray-800">Exclusão</h3>
                  <p className="text-gray-600 text-sm">Solicitar a remoção de seus dados</p>
                </div>
                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="font-semibold text-gray-800">Portabilidade</h3>
                  <p className="text-gray-600 text-sm">Exportar seus dados em formato legível</p>
                </div>
                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="font-semibold text-gray-800">Revogação</h3>
                  <p className="text-gray-600 text-sm">Retirar consentimento a qualquer momento</p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                7. Cookies e Tecnologias Similares
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Utilizamos cookies e tecnologias similares para melhorar sua experiência, 
                analisar o uso da plataforma e personalizar conteúdo. Você pode gerenciar 
                suas preferências de cookies através das configurações do seu navegador.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                8. Retenção de Dados
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Mantemos suas informações pessoais apenas pelo tempo necessário para cumprir 
                os propósitos descritos nesta política, cumprir obrigações legais ou resolver 
                disputas. Dados de campanhas podem ser mantidos por períodos mais longos 
                para fins de análise e relatórios.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                9. Alterações nesta Política
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos 
                sobre mudanças significativas através de e-mail ou aviso na plataforma. 
                Recomendamos revisar esta política regularmente.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                10. Contato
              </h2>
              <div className="bg-blue-50 p-6 rounded-lg">
                <p className="text-gray-700 leading-relaxed mb-4">
                  Para questões relacionadas à privacidade, exercício de direitos ou dúvidas 
                  sobre esta política, entre em contato conosco:
                </p>
                <div className="space-y-2">
                  <p className="text-gray-700">
                    <strong>E-mail:</strong> privacidade@allseeads.com.br
                  </p>
                  <p className="text-gray-700">
                    <strong>Telefone:</strong> (11) 99999-9999
                  </p>
                  <p className="text-gray-700">
                    <strong>Endereço:</strong> São Paulo, SP - Brasil
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Footer da página */}
          <div className="mt-12 pt-8 border-t border-gray-200 text-center">
            <p className="text-gray-500 text-sm">
              Esta política está em conformidade com a LGPD (Lei nº 13.709/2018) e 
              outras regulamentações aplicáveis de proteção de dados.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
