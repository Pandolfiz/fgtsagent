import React from 'react';
import Navbar from '../components/Navbar';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Política de Privacidade
          </h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Última atualização:</strong> 31 de agosto de 2025
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1. Informações que Coletamos
              </h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">
                1.1 Dados do Usuário
              </h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Nome completo</li>
                <li>Endereço de email</li>
                <li>Informações da empresa</li>
                <li>Número de telefone</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">
                1.2 Dados do WhatsApp Business
              </h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Número de telefone da conta WhatsApp Business</li>
                <li>ID da conta WhatsApp Business</li>
                <li>Mensagens recebidas (apenas para processamento)</li>
                <li>Dados de configuração da conta</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">
                1.3 Dados Técnicos
              </h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Logs de acesso</li>
                <li>Informações do dispositivo</li>
                <li>Endereço IP</li>
                <li>Cookies e dados de sessão</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                2. Como Usamos Suas Informações
              </h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">
                2.1 Funcionalidade da Plataforma
              </h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Fornecer os serviços da plataforma</li>
                <li>Processar mensagens do WhatsApp</li>
                <li>Gerenciar automações e respostas</li>
                <li>Manter a segurança da conta</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">
                2.2 Melhorias e Desenvolvimento
              </h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Melhorar a experiência do usuário</li>
                <li>Desenvolver novas funcionalidades</li>
                <li>Otimizar o desempenho da plataforma</li>
                <li>Analisar padrões de uso</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">
                2.3 Suporte e Comunicação
              </h3>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Prestar suporte técnico</li>
                <li>Enviar notificações importantes</li>
                <li>Comunicar atualizações e novidades</li>
                <li>Responder a solicitações de ajuda</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                3. Compartilhamento de Dados
              </h2>
              
              <p className="text-gray-700 mb-4">
                <strong>Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros</strong>, exceto nas seguintes situações:
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">
                3.1 Meta (WhatsApp Business API)
              </h3>
              <p className="text-gray-700 mb-4">
                Compartilhamos dados limitados com a Meta apenas para:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Conectar sua conta WhatsApp Business</li>
                <li>Processar mensagens através da API oficial</li>
                <li>Manter a funcionalidade da plataforma</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">
                3.2 Prestadores de Serviços
              </h3>
              <p className="text-gray-700 mb-4">
                Podemos compartilhar dados com prestadores de serviços que nos ajudam a:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Hospedar e manter a plataforma</li>
                <li>Processar pagamentos</li>
                <li>Fornecer suporte técnico</li>
                <li>Analisar dados de uso</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">
                3.3 Requisitos Legais
              </h3>
              <p className="text-gray-700 mb-4">
                Podemos divulgar informações quando exigido por lei ou para:
              </p>
              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Proteger nossos direitos legais</li>
                <li>Prevenir fraudes ou abusos</li>
                <li>Cumprir ordens judiciais</li>
                <li>Responder a investigações legais</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                4. Segurança dos Dados
              </h2>
              
              <p className="text-gray-700 mb-4">
                Implementamos medidas de segurança robustas para proteger seus dados:
              </p>

              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li><strong>Criptografia:</strong> Todos os dados são criptografados em trânsito e em repouso</li>
                <li><strong>HTTPS:</strong> Todas as comunicações usam HTTPS obrigatório</li>
                <li><strong>Controle de Acesso:</strong> Acesso restrito apenas a pessoal autorizado</li>
                <li><strong>Monitoramento:</strong> Monitoramento contínuo de segurança</li>
                <li><strong>Backups:</strong> Backups regulares e seguros</li>
                <li><strong>Atualizações:</strong> Manutenção regular de segurança</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                5. Seus Direitos
              </h2>
              
              <p className="text-gray-700 mb-4">
                Você tem os seguintes direitos em relação aos seus dados:
              </p>

              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li><strong>Acesso:</strong> Solicitar acesso aos seus dados pessoais</li>
                <li><strong>Correção:</strong> Solicitar correção de dados incorretos</li>
                <li><strong>Exclusão:</strong> Solicitar exclusão de seus dados</li>
                <li><strong>Portabilidade:</strong> Solicitar transferência de seus dados</li>
                <li><strong>Oposição:</strong> Opor-se ao processamento de seus dados</li>
                <li><strong>Restrição:</strong> Solicitar restrição do processamento</li>
              </ul>

              <p className="text-gray-700 mb-4">
                Para exercer esses direitos, entre em contato conosco através do email: <strong>admin@fgtsagent.com.br</strong>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                6. Retenção de Dados
              </h2>
              
              <p className="text-gray-700 mb-4">
                Mantemos seus dados apenas pelo tempo necessário para:
              </p>

              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Fornecer os serviços contratados</li>
                <li>Cumprir obrigações legais</li>
                <li>Resolver disputas</li>
                <li>Manter a segurança da plataforma</li>
              </ul>

              <p className="text-gray-700 mb-4">
                Quando você cancela sua conta, excluímos seus dados pessoais dentro de 30 dias, exceto quando exigido por lei.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                7. Cookies e Tecnologias Similares
              </h2>
              
              <p className="text-gray-700 mb-4">
                Utilizamos cookies e tecnologias similares para:
              </p>

              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Manter sua sessão ativa</li>
                <li>Lembrar suas preferências</li>
                <li>Analisar o uso da plataforma</li>
                <li>Melhorar a experiência do usuário</li>
              </ul>

              <p className="text-gray-700 mb-4">
                Você pode controlar o uso de cookies através das configurações do seu navegador.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                8. Conformidade Legal
              </h2>
              
              <p className="text-gray-700 mb-4">
                Esta política está em conformidade com:
              </p>

              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li><strong>LGPD (Lei Geral de Proteção de Dados):</strong> Lei brasileira de proteção de dados</li>
                <li><strong>GDPR (General Data Protection Regulation):</strong> Regulamento europeu de proteção de dados</li>
                <li><strong>Políticas da Meta:</strong> Políticas de privacidade da Meta/Facebook</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                9. Alterações nesta Política
              </h2>
              
              <p className="text-gray-700 mb-4">
                Podemos atualizar esta política periodicamente. Quando fizermos alterações significativas:
              </p>

              <ul className="list-disc pl-6 mb-4 text-gray-700">
                <li>Notificaremos você por email</li>
                <li>Atualizaremos a data de "última atualização"</li>
                <li>Publicaremos a nova versão no site</li>
              </ul>

              <p className="text-gray-700 mb-4">
                O uso continuado da plataforma após as alterações constitui aceitação da nova política.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                10. Contato
              </h2>
              
              <p className="text-gray-700 mb-4">
                Se você tiver dúvidas sobre esta política de privacidade, entre em contato conosco:
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


