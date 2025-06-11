import React from 'react';
import Navbar from '../components/Navbar';

export default function TermsOfUse() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-xl border border-cyan-800/30 overflow-hidden">
            <div className="px-6 py-8 sm:px-8 sm:py-10">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-cyan-200 to-blue-300 mb-4">
                  Termos de Uso
                </h1>
                <p className="text-cyan-200">
                  Última atualização: {new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>

              <div className="prose prose-invert max-w-none">
                <div className="space-y-6 text-gray-300">
                  <section>
                    <h2 className="text-xl font-semibold text-emerald-300 mb-3">1. Aceitação dos Termos</h2>
                    <p>
                      Ao acessar e utilizar a plataforma FGTS Agent, você concorda em cumprir e estar vinculado a estes 
                      Termos de Uso. Se você não concordar com qualquer parte destes termos, não deve utilizar nossos serviços.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-emerald-300 mb-3">2. Descrição do Serviço</h2>
                    <p>
                      O FGTS Agent é uma plataforma que oferece serviços de consultoria e auxílio para questões relacionadas 
                      ao Fundo de Garantia do Tempo de Serviço (FGTS), incluindo:
                    </p>
                    <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                      <li>Consultas sobre saldo e extratos do FGTS</li>
                      <li>Orientações sobre saque do FGTS</li>
                      <li>Auxílio em procedimentos administrativos</li>
                      <li>Esclarecimentos sobre direitos relacionados ao FGTS</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-emerald-300 mb-3">3. Elegibilidade e Cadastro</h2>
                    <p>
                      Para utilizar nossos serviços, você deve:
                    </p>
                    <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                      <li>Ser maior de 18 anos ou ter autorização legal para usar nossos serviços</li>
                      <li>Fornecer informações precisas e atualizadas durante o cadastro</li>
                      <li>Manter a confidencialidade de suas credenciais de acesso</li>
                      <li>Notificar-nos imediatamente sobre qualquer uso não autorizado de sua conta</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-emerald-300 mb-3">4. Uso Aceitável</h2>
                    <p>
                      Ao utilizar nossa plataforma, você concorda em:
                    </p>
                    <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                      <li>Utilizar os serviços apenas para fins legais e legítimos</li>
                      <li>Não interferir ou interromper o funcionamento da plataforma</li>
                      <li>Não tentar acessar áreas restritas sem autorização</li>
                      <li>Respeitar os direitos de propriedade intelectual</li>
                      <li>Não transmitir conteúdo malicioso ou prejudicial</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-emerald-300 mb-3">5. Privacidade e Proteção de Dados</h2>
                    <p>
                      Levamos a sério a proteção de seus dados pessoais. Nossa Política de Privacidade descreve como 
                      coletamos, utilizamos e protegemos suas informações. Ao usar nossos serviços, você concorda com 
                      as práticas descritas em nossa Política de Privacidade.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-emerald-300 mb-3">6. Limitação de Responsabilidade</h2>
                    <p>
                      O FGTS Agent fornece informações e orientações de caráter geral. Não somos responsáveis por:
                    </p>
                    <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                      <li>Decisões tomadas com base nas informações fornecidas</li>
                      <li>Resultados específicos de procedimentos administrativos</li>
                      <li>Danos diretos ou indiretos decorrentes do uso da plataforma</li>
                      <li>Indisponibilidade temporária dos serviços</li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-emerald-300 mb-3">7. Modificações dos Termos</h2>
                    <p>
                      Reservamo-nos o direito de modificar estes Termos de Uso a qualquer momento. As modificações 
                      entrarão em vigor imediatamente após sua publicação na plataforma. É sua responsabilidade 
                      revisar periodicamente os termos atualizados.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-emerald-300 mb-3">8. Suspensão e Encerramento</h2>
                    <p>
                      Podemos suspender ou encerrar sua conta a qualquer momento, sem aviso prévio, se detectarmos 
                      violação destes termos ou uso inadequado da plataforma.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-emerald-300 mb-3">9. Lei Aplicável</h2>
                    <p>
                      Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. Qualquer 
                      disputa será resolvida no foro da comarca onde está localizada nossa sede.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold text-emerald-300 mb-3">10. Contato</h2>
                    <p>
                      Se você tiver dúvidas sobre estes Termos de Uso, entre em contato conosco:
                    </p>
                    <div className="mt-2 space-y-1">
                      <p><strong>Email:</strong> contato@fgtsagent.com</p>
                      <p><strong>WhatsApp:</strong> (27) 99611-5348</p>
                      <p><strong>Endereço:</strong> Vitória, ES - Brasil</p>
                    </div>
                  </section>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-cyan-800/30">
                <p className="text-center text-sm text-cyan-300">
                  © {new Date().getFullYear()} FGTS Agent. Todos os direitos reservados.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 