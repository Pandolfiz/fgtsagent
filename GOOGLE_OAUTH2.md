# Configuração do Google OAuth2

Este documento fornece instruções detalhadas sobre como configurar a autenticação OAuth2 do Google na sua aplicação.

## Correções Implementadas

As seguintes correções foram implementadas para resolver os problemas com a autenticação do Google OAuth2:

1. **Implementação do método `getGoogleUserInfo`**: Adicionado no arquivo `auth.js` para obter informações do usuário usando um token do Google.

2. **Atualização da rota de popup OAuth2**: A rota `/api/credentials/oauth2/popup/:provider` no `app.js` foi atualizada para incluir validação adequada e tratamento de erros.

3. **Correção da rota de callback**: A rota `/auth/callback` no `authRoutes.js` foi atualizada para processar corretamente o código de autorização do Google.

4. **Implementação do método `saveCredential`**: Adicionado ao serviço de credenciais para garantir que as credenciais OAuth2 sejam salvas corretamente.

5. **Criação de página HTML de callback**: Adicionados os arquivos `oauth-handler.html` e `oauth-redirect.html` na pasta `frontend/dist` para melhorar a experiência do usuário durante o processo de autorização.

## Criar Credenciais no Google Cloud Platform

1. Acesse o [Console do Google Cloud Platform](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. No menu lateral, vá para "APIs e Serviços" > "Credenciais"
4. Clique no botão "CRIAR CREDENCIAIS" e selecione "ID do Cliente OAuth"
5. Configure o tipo de aplicação como "Aplicativo da Web"
6. Dê um nome à sua aplicação (por exemplo, "Minha Aplicação SAAS")
7. Em "URIs de redirecionamento autorizados", adicione:
   - http://localhost:3000/auth/callback (para ambiente de desenvolvimento)
   - https://seu-dominio.com/auth/callback (para ambiente de produção)
8. Clique em "Criar"
9. Anote o "ID do cliente" e o "Segredo do cliente" gerados

## Configurar API do Google

1. No console do Google Cloud Platform, vá para "APIs e Serviços" > "Biblioteca"
2. Pesquise e ative as seguintes APIs:
   - Google People API (para acessar informações de perfil)
   - Google Drive API (se precisar acessar arquivos do Google Drive)
   - Gmail API (se precisar acessar emails do Gmail)

## Configurar Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env`:

```
GOOGLE_CLIENT_ID=seu-client-id-aqui
GOOGLE_CLIENT_SECRET=seu-client-secret-aqui
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
```

Para ambiente de produção, altere o GOOGLE_REDIRECT_URI para usar o domínio da sua aplicação.

## Fluxo de Autenticação OAuth2

O fluxo de autenticação OAuth2 com o Google segue estes passos:

1. O usuário clica no botão para adicionar uma credencial do Google
2. O sistema abre um popup com a URL `/api/credentials/oauth2/popup/google`
3. O usuário é redirecionado para a página de consentimento do Google
4. Após autorização, o Google redireciona para `/auth/callback` com um código
5. O backend troca o código por um token de acesso usando a API do Google
6. O backend obtém as informações do usuário usando o token de acesso
7. A credencial é salva no banco de dados associada à organização
8. O popup é fechado e a aplicação principal é notificada sobre o sucesso

## Testar a Integração

1. Inicie sua aplicação
2. Acesse a página de gerenciamento de credenciais de uma organização
3. Clique no botão para adicionar uma nova credencial do Google
4. Um popup será aberto para autenticação
5. Após autenticar, a credencial será salva e associada à sua organização

## Resolução de Problemas

Se você encontrar erros durante a autenticação, verifique:

1. **URIs de redirecionamento**: Certifique-se de que o URI de redirecionamento configurado no console do Google corresponde exatamente ao URI usado na aplicação (incluindo protocolo http/https e sem barras finais).

2. **Escopos**: Se você estiver recebendo erros de permissão, verifique se habilitou todas as APIs necessárias no console do Google Cloud.

3. **Cookies**: A integração usa cookies para comunicação entre janelas. Certifique-se de que os cookies não estão sendo bloqueados pelo navegador.

4. **Logs do Servidor**: Verifique os logs do servidor para mensagens de erro detalhadas que podem ajudar a identificar o problema.

## Testes de Validação

Execute os seguintes testes para validar a integração:

1. **Autenticação Bem-sucedida**: Tente conectar uma conta Google e verifique se a credencial é salva corretamente.

2. **Renovação de Token**: Após salvar uma credencial, aguarde algum tempo e verifique se o token de acesso é renovado automaticamente usando o refresh token.

3. **Verificação de Status**: Use a API para verificar o status de uma credencial OAuth2 e confirme que ela retorna o status correto.

4. **Revogação de Acesso**: Teste revogar o acesso (removendo a credencial) e depois reconectando a mesma conta. 