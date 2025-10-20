import React from 'react'
import HeaderPolTerm from '@/Components/HeaderPolTerm'
import Footer from '@/Components/Footer'

export default function TermosPage() {
  return (
    <div className="min-h-screen  bg-gray-50">
      <HeaderPolTerm />
      
      <div className="max-w-4xl mx-auto px-4 pb-12 pt-36">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Termos de Serviço
            </h1>
            <p className="text-lg text-gray-600">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1. Aceitação dos Termos
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Bem-vindo à AllSee! Estes Termos de Serviço ("Termos") regem o uso de nossa 
                plataforma de publicidade digital. Ao acessar ou utilizar nossos serviços, 
                você concorda em cumprir e estar vinculado a estes termos.
              </p>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <p className="text-yellow-800">
                  <strong>Importante:</strong> Se você não concordar com qualquer parte destes termos, 
                  não deve utilizar nossos serviços.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                2. Descrição dos Serviços
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                A ALL SEE oferece uma plataforma completa de publicidade digital que inclui:
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-sm font-bold">1</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">Criação de Campanhas</h3>
                      <p className="text-gray-600 text-sm">Desenvolvimento de anúncios personalizados</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-sm font-bold">2</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">Gestão de Totens</h3>
                      <p className="text-gray-600 text-sm">Controle e monitoramento de displays digitais</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-sm font-bold">3</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">Análise de Performance</h3>
                      <p className="text-gray-600 text-sm">Relatórios detalhados e métricas</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-white text-sm font-bold">4</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">Suporte Técnico</h3>
                      <p className="text-gray-600 text-sm">Assistência especializada 24/7</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                3. Cadastro e Conta de Usuário
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-medium text-gray-800 mb-2">
                    3.1 Requisitos para Cadastro
                  </h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-2">
                    <li>Ser maior de 18 anos ou representar uma empresa legalmente constituída</li>
                    <li>Fornecer informações verdadeiras, precisas e atualizadas</li>
                    <li>Manter a confidencialidade de suas credenciais de acesso</li>
                    <li>Notificar imediatamente sobre uso não autorizado de sua conta</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium text-gray-800 mb-2">
                    3.2 Responsabilidades do Usuário
                  </h3>
                  <ul className="list-disc list-inside text-gray-700 space-y-2">
                    <li>Manter informações de contato atualizadas</li>
                    <li>Utilizar a plataforma apenas para fins legais e comerciais</li>
                    <li>Respeitar direitos de propriedade intelectual</li>
                    <li>Não compartilhar acesso com terceiros não autorizados</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                4. Pagamentos e Cobrança
              </h2>
              <div className="bg-gray-100 p-6 rounded-lg">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Modalidades de Pagamento
                    </h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                      <li>Cartão de crédito (Visa, Mastercard, American Express)</li>
                      <li>PIX para pagamentos instantâneos</li>
                      <li>Boleto bancário para empresas</li>
                      <li>Transferência bancária</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Política de Cobrança
                    </h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-2">
                      <li>Cobrança antecipada para campanhas</li>
                      <li>Renovação automática conforme plano contratado</li>
                      <li>Taxas de cancelamento conforme política vigente</li>
                      <li>Reembolsos processados em até 30 dias úteis</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                5. Conteúdo e Propriedade Intelectual
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-medium text-gray-800 mb-2">
                    5.1 Conteúdo do Usuário
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Você mantém todos os direitos sobre o conteúdo que envia para nossa plataforma. 
                    Ao fazer upload de materiais, você nos concede uma licença não exclusiva para 
                    utilizar, reproduzir e distribuir esse conteúdo para fins de prestação dos serviços.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium text-gray-800 mb-2">
                    5.2 Propriedade da Plataforma
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Todos os direitos sobre a plataforma AllSee, incluindo software, design, 
                    funcionalidades e marca, são de nossa propriedade exclusiva e protegidos 
                    por leis de propriedade intelectual.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                6. Uso Aceitável
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-900 mb-3">
                    ✅ Uso Permitido
                  </h3>
                  <ul className="text-green-800 space-y-2">
                    <li>• Campanhas publicitárias legais</li>
                    <li>• Conteúdo respeitoso e apropriado</li>
                    <li>• Uso comercial legítimo</li>
                    <li>• Respeito às leis aplicáveis</li>
                  </ul>
                </div>
                
                <div className="bg-red-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-red-900 mb-3">
                    ❌ Uso Proibido
                  </h3>
                  <ul className="text-red-800 space-y-2">
                    <li>• Conteúdo ilegal ou ofensivo</li>
                    <li>• Violação de direitos autorais</li>
                    <li>• Spam ou atividades maliciosas</li>
                    <li>• Tentativas de hackear a plataforma</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                7. Limitação de Responsabilidade
              </h2>
              <div className="bg-blue-50 p-6 rounded-lg">
                <p className="text-gray-700 leading-relaxed mb-4">
                  Nossa responsabilidade é limitada conforme permitido por lei. Não seremos 
                  responsáveis por:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>Danos indiretos, incidentais ou consequenciais</li>
                  <li>Perda de lucros ou oportunidades de negócio</li>
                  <li>Interrupções temporárias do serviço</li>
                  <li>Ações de terceiros ou eventos fora de nosso controle</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                8. Suspensão e Cancelamento
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-medium text-gray-800 mb-2">
                    8.1 Suspensão de Conta
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Reservamo-nos o direito de suspender ou cancelar contas que violem estes 
                    termos, incluindo casos de:
                  </p>
                  <ul className="list-disc list-inside text-gray-700 space-y-2">
                    <li>Uso inadequado da plataforma</li>
                    <li>Violation de leis ou regulamentações</li>
                    <li>Não pagamento de taxas devidas</li>
                    <li>Atividades fraudulentas ou suspeitas</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium text-gray-800 mb-2">
                    8.2 Cancelamento pelo Usuário
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Você pode cancelar sua conta a qualquer momento através do painel de controle 
                    ou entrando em contato conosco. O cancelamento será efetivado conforme 
                    os termos do plano contratado.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                9. Modificações dos Termos
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Podemos modificar estes termos periodicamente para refletir mudanças em nossos 
                serviços ou requisitos legais. Notificaremos sobre alterações significativas 
                através de e-mail ou aviso na plataforma. O uso continuado após as modificações 
                constitui aceitação dos novos termos.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                10. Lei Aplicável e Foro
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Estes termos são regidos pelas leis brasileiras. Qualquer disputa será resolvida 
                nos tribunais competentes de São Paulo, SP, Brasil.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                11. Contato
              </h2>
              <div className="bg-blue-50 p-6 rounded-lg">
                <p className="text-gray-700 leading-relaxed mb-4">
                  Para questões relacionadas a estes termos ou nossos serviços, entre em contato:
                </p>
                <div className="space-y-2">
                  <p className="text-gray-700">
                    <strong>E-mail:</strong> suporte@allseeads.com.br
                  </p>
                  <p className="text-gray-700">
                    <strong>Telefone:</strong> (66) 9 9976-9524
                  </p>
                  <p className="text-gray-700">
                    <strong>WhatsApp:</strong> (66) 9 9976-9524
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
              Ao utilizar nossos serviços, você confirma que leu, entendeu e concorda 
              com estes Termos de Serviço.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
