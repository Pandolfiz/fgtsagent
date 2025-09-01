import React from 'react';
import Navbar from '../components/Navbar';

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Termos de Serviço
          </h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Última atualização:</strong> 31 de agosto de 2025
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1. Aceitação dos Termos
              </h2>
              
              <p className="text-gray-700 mb-4">
                Ao acessar e usar a plataforma FgtsAgent, você concorda em cumprir e estar vinculado a estes Termos de Serviço. Se você não concordar com qualquer parte destes termos, não deve usar nossos serviços.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                2. Descrição do Serviço
              </h2>
              
              <p className="text-gray-700 mb-4">
                O FgtsAgent é uma plataforma SaaS que permite aos usuários:
              </p>

              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Conectar suas contas WhatsApp Business</li>
                <li>Gerenciar mensagens recebidas</li>
                <li>Configurar automações e respostas</li>
                <li>Analisar métricas de comunicação</li>
                <li>Melhorar o atendimento ao cliente</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                3. Elegibilidade
              </h2>
              
              <p className="text-gray-700 mb-4">
                Para usar nossos serviços, você deve:
              </p>

              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Ter pelo menos 18 anos de idade</li>
                <li>Ter capacidade legal para celebrar contratos</li>
                <li>Possuir uma conta WhatsApp Business válida</li>
                <li>Concordar com estes termos de serviço</li>
                <li>Fornecer informações precisas e atualizadas</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                4. Uso Aceitável
              </h2>
              
              <p className="text-gray-700 mb-4">
                Você concorda em usar nossos serviços apenas para fins legítimos e comerciais. É proibido:
              </p>

              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Usar para spam ou mensagens não solicitadas</li>
                <li>Enviar conteúdo ilegal, ofensivo ou inadequado</li>
                <li>Violar direitos de propriedade intelectual</li>
                <li>Tentar acessar sistemas sem autorização</li>
                <li>Interferir no funcionamento da plataforma</li>
                <li>Usar para atividades fraudulentas</li>
                <li>Violar leis aplicáveis ou regulamentos</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                5. Conta e Segurança
              </h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">
                5.1 Criação de Conta
              </h3>
              <p className="text-gray-700 mb-4">
                Você é responsável por:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Manter a confidencialidade de suas credenciais</li>
                <li>Notificar-nos imediatamente sobre uso não autorizado</li>
                <li>Manter informações da conta atualizadas</li>
                <li>Ser responsável por todas as atividades em sua conta</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">
                5.2 Segurança
              </h3>
              <p className="text-gray-700 mb-4">
                Implementamos medidas de segurança, mas você também deve:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Usar senhas fortes e únicas</li>
                <li>Ativar autenticação de dois fatores quando disponível</li>
                <li>Não compartilhar credenciais com terceiros</li>
                <li>Fazer logout ao terminar o uso</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                6. Limitações da API
              </h2>
              
              <p className="text-gray-700 mb-4">
                Nosso serviço depende da API oficial do WhatsApp Business. Você concorda em:
              </p>

              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Respeitar os limites de taxa da API do WhatsApp</li>
                <li>Não exceder quotas de mensagens</li>
                <li>Seguir as políticas de uso da Meta/WhatsApp</li>
                <li>Não usar a API para spam ou abuso</li>
                <li>Manter conformidade com as diretrizes da Meta</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                7. Conteúdo e Responsabilidades
              </h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">
                7.1 Seu Conteúdo
              </h3>
              <p className="text-gray-700 mb-4">
                Você é responsável por:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Todo o conteúdo das mensagens enviadas</li>
                <li>Conformidade com leis de proteção ao consumidor</li>
                <li>Obter consentimento quando necessário</li>
                <li>Respeitar direitos de privacidade</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">
                7.2 Nossa Responsabilidade
              </h3>
              <p className="text-gray-700 mb-4">
                Fornecemos a plataforma, mas não somos responsáveis por:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Conteúdo das mensagens dos usuários</li>
                <li>Interações entre usuários e clientes</li>
                <li>Decisões de negócio baseadas em nossos dados</li>
                <li>Problemas na API do WhatsApp</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                8. Pagamentos e Cobrança
              </h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">
                8.1 Planos e Preços
              </h3>
              <p className="text-gray-700 mb-4">
                Oferecemos diferentes planos de assinatura. Os preços podem ser alterados com aviso prévio de 30 dias.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">
                8.2 Cobrança
              </h3>
              <p className="text-gray-700 mb-4">
                A cobrança é feita automaticamente no início de cada período. Você é responsável por manter métodos de pagamento válidos.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">
                8.3 Reembolsos
              </h3>
              <p className="text-gray-700 mb-4">
                Reembolsos são avaliados caso a caso, conforme nossa política de reembolso.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                9. Propriedade Intelectual
              </h2>
              
              <p className="text-gray-700 mb-4">
                A plataforma FgtsAgent e todo o conteúdo relacionado são protegidos por direitos autorais e outras leis de propriedade intelectual. Você mantém os direitos sobre seu conteúdo, mas nos concede licença para processá-lo conforme necessário para fornecer nossos serviços.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                10. Limitação de Responsabilidade
              </h2>
              
              <p className="text-gray-700 mb-4">
                Em nenhuma circunstância seremos responsáveis por:
              </p>

              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Danos indiretos, incidentais ou consequenciais</li>
                <li>Perda de lucros ou dados</li>
                <li>Interrupções do serviço</li>
                <li>Problemas de conectividade</li>
                <li>Danos causados por terceiros</li>
              </ul>

              <p className="text-gray-700 mb-4">
                Nossa responsabilidade total é limitada ao valor pago por você nos últimos 12 meses.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                11. Indenização
              </h2>
              
              <p className="text-gray-700 mb-4">
                Você concorda em nos indenizar e nos manter livres de qualquer reclamação, dano ou despesa decorrente de:
              </p>

              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Uso inadequado de nossos serviços</li>
                <li>Violação destes termos</li>
                <li>Conteúdo inadequado ou ilegal</li>
                <li>Violação de direitos de terceiros</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                12. Terminação
              </h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">
                12.1 Por Você
              </h3>
              <p className="text-gray-700 mb-4">
                Você pode cancelar sua conta a qualquer momento através do painel de controle.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">
                12.2 Por Nós
              </h3>
              <p className="text-gray-700 mb-4">
                Podemos encerrar sua conta imediatamente se você:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Violar estes termos</li>
                <li>Usar o serviço de forma inadequada</li>
                <li>Não pagar pelos serviços</li>
                <li>Engajar em atividades fraudulentas</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">
                12.3 Efeitos da Terminação
              </h3>
              <p className="text-gray-700 mb-4">
                Após a terminação:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Seu acesso será revogado imediatamente</li>
                <li>Excluiremos seus dados em 30 dias</li>
                <li>Não haverá reembolso de pagamentos antecipados</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                13. Modificações dos Termos
              </h2>
              
              <p className="text-gray-700 mb-4">
                Podemos modificar estes termos a qualquer momento. Alterações significativas serão comunicadas por email com 30 dias de antecedência. O uso continuado após as modificações constitui aceitação dos novos termos.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                14. Lei Aplicável
              </h2>
              
              <p className="text-gray-700 mb-4">
                Estes termos são regidos pelas leis brasileiras. Qualquer disputa será resolvida nos tribunais competentes do Brasil.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                15. Disposições Gerais
              </h2>
              
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li><strong>Integralidade:</strong> Estes termos constituem o acordo completo entre as partes</li>
                <li><strong>Divisibilidade:</strong> Se qualquer parte for inválida, o restante permanece válido</li>
                <li><strong>Renúncia:</strong> A falha em fazer valer um direito não constitui renúncia</li>
                <li><strong>Força Maior:</strong> Não somos responsáveis por eventos fora de nosso controle</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                16. Contato
              </h2>
              
              <p className="text-gray-700 mb-4">
                Para dúvidas sobre estes termos, entre em contato conosco:
              </p>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 mb-2">
                  <strong>Email:</strong> admin@fgtsagent.com.br
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Website:</strong> https://fgtsagent.com.br
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Suporte:</strong> https://fgtsagent.com.br/support
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}


