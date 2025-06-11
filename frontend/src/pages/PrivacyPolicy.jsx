import React from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaUserShield } from 'react-icons/fa';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 relative">
      {/* Header */}
      <header className="relative z-10 py-8 px-6">
        <div className="container mx-auto">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-100 transition-colors mb-6"
          >
            <FaArrowLeft size={20} />
            <span>Voltar para Home</span>
          </Link>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <FaUserShield className="text-cyan-300" size={48} />
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-500 text-transparent bg-clip-text">
                Política de Privacidade
              </h1>
            </div>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Como coletamos, usamos e protegemos seus dados pessoais
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 py-12 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-white/10 rounded-2xl p-8 md:p-12 shadow-xl backdrop-blur-lg border border-cyan-400/40">
            <div className="prose prose-lg prose-invert max-w-none">
              
              <section className="mb-8">
                <p className="text-white/90 mb-6">
                  <strong>Data de última atualização:</strong> {new Date().toLocaleDateString('pt-BR')}
                </p>
                
                <p className="text-white/80 leading-relaxed">
                  Esta Política de Privacidade descreve como o FgtsAgent coleta, usa, armazena e 
                  protege suas informações pessoais, em conformidade com a Lei Geral de Proteção 
                  de Dados (LGPD) e outras regulamentações aplicáveis.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-cyan-300 mb-4">1. Informações que Coletamos</h2>
                
                <h3 className="text-xl font-semibold text-cyan-200 mb-3">1.1 Dados Pessoais</h3>
                <ul className="list-disc list-inside text-white/80 leading-relaxed space-y-2 mb-4">
                  <li>Nome completo e dados de identificação</li>
                  <li>Endereço de e-mail e telefone</li>
                  <li>Dados da empresa (CNPJ, razão social)</li>
                  <li>Informações profissionais e cargo</li>
                </ul>

                <h3 className="text-xl font-semibold text-cyan-200 mb-3">1.2 Dados de Clientes</h3>
                <ul className="list-disc list-inside text-white/80 leading-relaxed space-y-2 mb-4">
                  <li>Informações de leads e prospects</li>
                  <li>Dados para simulação de FGTS (conforme necessário)</li>
                  <li>Histórico de conversas e atendimentos</li>
                  <li>Dados de propostas e contratos</li>
                </ul>

                <h3 className="text-xl font-semibold text-cyan-200 mb-3">1.3 Dados Técnicos</h3>
                <ul className="list-disc list-inside text-white/80 leading-relaxed space-y-2">
                  <li>Endereço IP e informações do navegador</li>
                  <li>Cookies e tecnologias similares</li>
                  <li>Logs de acesso e uso da plataforma</li>
                  <li>Métricas de performance e analytics</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-cyan-300 mb-4">2. Finalidades do Tratamento</h2>
                <p className="text-white/80 leading-relaxed mb-4">
                  Utilizamos seus dados pessoais para as seguintes finalidades:
                </p>
                <ul className="list-disc list-inside text-white/80 leading-relaxed space-y-2">
                  <li>Prestação dos serviços da plataforma FgtsAgent</li>
                  <li>Autenticação e controle de acesso</li>
                  <li>Comunicação sobre atualizações e novidades</li>
                  <li>Suporte técnico e atendimento ao cliente</li>
                  <li>Análise de performance e melhoria dos serviços</li>
                  <li>Cumprimento de obrigações legais e regulatórias</li>
                  <li>Prevenção à fraude e segurança da informação</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-cyan-300 mb-4">3. Base Legal para o Tratamento</h2>
                <p className="text-white/80 leading-relaxed mb-4">
                  O tratamento de dados pessoais é realizado com base nas seguintes hipóteses legais:
                </p>
                <ul className="list-disc list-inside text-white/80 leading-relaxed space-y-2">
                  <li><strong>Execução de contrato:</strong> Para prestação dos serviços contratados</li>
                  <li><strong>Legítimo interesse:</strong> Para melhoria dos serviços e segurança</li>
                  <li><strong>Consentimento:</strong> Para comunicações de marketing (quando aplicável)</li>
                  <li><strong>Cumprimento de obrigação legal:</strong> Para atender exigências regulatórias</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-cyan-300 mb-4">4. Compartilhamento de Dados</h2>
                <p className="text-white/80 leading-relaxed mb-4">
                  Seus dados podem ser compartilhados nas seguintes situações:
                </p>
                <ul className="list-disc list-inside text-white/80 leading-relaxed space-y-2">
                  <li>Com prestadores de serviços essenciais (hosting, pagamento, etc.)</li>
                  <li>Com autoridades competentes, quando exigido por lei</li>
                  <li>Com nossos parceiros comerciais, mediante seu consentimento</li>
                  <li>Em caso de fusão, aquisição ou reorganização empresarial</li>
                </ul>
                <p className="text-white/80 leading-relaxed mt-4">
                  <strong>Importante:</strong> Nunca vendemos seus dados pessoais para terceiros.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-cyan-300 mb-4">5. Armazenamento e Segurança</h2>
                
                <h3 className="text-xl font-semibold text-cyan-200 mb-3">5.1 Localização dos Dados</h3>
                <p className="text-white/80 leading-relaxed mb-4">
                  Seus dados são armazenados em servidores localizados no Brasil, em conformidade 
                  com a legislação nacional. Utilizamos provedores de nuvem certificados e seguros.
                </p>

                <h3 className="text-xl font-semibold text-cyan-200 mb-3">5.2 Medidas de Segurança</h3>
                <ul className="list-disc list-inside text-white/80 leading-relaxed space-y-2">
                  <li>Criptografia de dados em trânsito e em repouso</li>
                  <li>Controles de acesso baseados em funções</li>
                  <li>Monitoramento contínuo de segurança</li>
                  <li>Backup e planos de recuperação de desastres</li>
                  <li>Auditorias regulares de segurança</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-cyan-300 mb-4">6. Retenção de Dados</h2>
                <p className="text-white/80 leading-relaxed mb-4">
                  Os dados pessoais são mantidos pelo tempo necessário para as finalidades 
                  descritas nesta política, observando:
                </p>
                <ul className="list-disc list-inside text-white/80 leading-relaxed space-y-2">
                  <li>Dados de cadastro: Durante a vigência do contrato e por 5 anos após</li>
                  <li>Dados de clientes: Conforme exigências regulatórias do setor financeiro</li>
                  <li>Logs de acesso: 12 meses para fins de segurança</li>
                  <li>Dados para marketing: Até a revogação do consentimento</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-cyan-300 mb-4">7. Seus Direitos</h2>
                <p className="text-white/80 leading-relaxed mb-4">
                  Como titular de dados pessoais, você tem os seguintes direitos:
                </p>
                <ul className="list-disc list-inside text-white/80 leading-relaxed space-y-2">
                  <li><strong>Acesso:</strong> Obter informações sobre o tratamento de seus dados</li>
                  <li><strong>Correção:</strong> Solicitar correção de dados incompletos ou incorretos</li>
                  <li><strong>Exclusão:</strong> Solicitar eliminação de dados desnecessários</li>
                  <li><strong>Portabilidade:</strong> Solicitar transferência dos dados para outro fornecedor</li>
                  <li><strong>Oposição:</strong> Opor-se ao tratamento em certas circunstâncias</li>
                  <li><strong>Revogação:</strong> Revogar consentimento a qualquer momento</li>
                  <li><strong>Informação:</strong> Obter informações sobre compartilhamento</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-cyan-300 mb-4">8. Cookies e Tecnologias Similares</h2>
                <p className="text-white/80 leading-relaxed mb-4">
                  Utilizamos cookies e tecnologias similares para:
                </p>
                <ul className="list-disc list-inside text-white/80 leading-relaxed space-y-2">
                  <li>Manter sua sessão ativa na plataforma</li>
                  <li>Lembrar suas preferências de uso</li>
                  <li>Coletar estatísticas de uso</li>
                  <li>Melhorar a experiência do usuário</li>
                </ul>
                <p className="text-white/80 leading-relaxed mt-4">
                  Você pode gerenciar cookies através das configurações do seu navegador.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-cyan-300 mb-4">9. Menores de Idade</h2>
                <p className="text-white/80 leading-relaxed">
                  O FgtsAgent não é destinado a menores de 18 anos. Não coletamos 
                  intencionalmente dados de menores. Se identificarmos dados de menor, 
                  tomaremos medidas para removê-los imediatamente.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-cyan-300 mb-4">10. Alterações nesta Política</h2>
                <p className="text-white/80 leading-relaxed">
                  Esta política pode ser atualizada periodicamente. Notificaremos sobre 
                  alterações significativas através da plataforma ou por e-mail. 
                  A versão atualizada será sempre disponibilizada nesta página.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-cyan-300 mb-4">11. Encarregado de Dados (DPO)</h2>
                <p className="text-white/80 leading-relaxed mb-4">
                  Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento 
                  de dados, entre em contato com nosso Encarregado de Dados:
                </p>
                <ul className="list-disc list-inside text-white/80 leading-relaxed space-y-2">
                  <li>Email: fgtsagent@gmail.com.br</li>
                  <li>Telefone: +55 11 99999-9999</li>
                  <li>Formulário online: Disponível no painel da plataforma</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-cyan-300 mb-4">12. Autoridade de Controle</h2>
                <p className="text-white/80 leading-relaxed">
                  Se não estivermos conseguindo resolver sua solicitação, você pode 
                  entrar em contato com a Autoridade Nacional de Proteção de Dados (ANPD) 
                  através do site: 
                  <a href="https://www.gov.br/anpd/" target="_blank" rel="noopener noreferrer" 
                     className="text-cyan-300 hover:text-cyan-100 underline ml-1">
                    https://www.gov.br/anpd/
                  </a>
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-cyan-300 mb-4">13. Contato</h2>
                <p className="text-white/80 leading-relaxed">
                  Para dúvidas sobre esta política de privacidade, entre em contato:
                </p>
                <ul className="list-disc list-inside text-white/80 leading-relaxed space-y-2 mt-4">
                  <li>Email: fgtsagent@gmail.com.br</li>
                  <li>WhatsApp: +55 11 99999-9999</li>
                  <li>Endereço: Vitória, ES, Brasil</li>
                </ul>
              </section>

            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center text-cyan-200">
        <span className="drop-shadow-neon">
          FgtsAgent &copy; {new Date().getFullYear()} &mdash; Tecnologia para o futuro do crédito
        </span>
      </footer>

      {/* Background */}
      <div className="fixed inset-0 w-full h-full z-[-20] animate-gradient-move bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950" 
           style={{backgroundSize: '400% 400%'}} 
           aria-hidden="true" />
    </div>
  );
} 