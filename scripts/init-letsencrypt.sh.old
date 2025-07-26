#!/bin/bash

# NOTA: Este script deve ser executado APENAS UMA VEZ para a configuração inicial do Certbot.
# Para renovações, o serviço certbot no docker compose cuidará disso.

# --- Configuração ---
domains=(fgtsagent.com.br www.fgtsagent.com.br)
email="fgtsagent@gmail.com" # Verifique se este é o email correto

# Caminho para os dados do Certbot no host (corresponde aos volumes no docker compose.yml)
data_path_host="./data/certbot"
main_domain="${domains[0]}"

# --- Verificações Preliminares ---
echo "### Verificando se o Docker está em execução..."
docker ps > /dev/null
if [ $? -ne 0 ]; then
  echo "Erro: O Docker não parece estar em execução. Por favor, inicie o Docker e tente novamente."
  exit 1
fi

echo "### Verificando se o docker compose está acessível..."
docker compose --version > /dev/null
if [ $? -ne 0 ]; then
  echo "Erro: docker compose não encontrado. Certifique-se de que está instalado e no seu PATH."
  exit 1
fi

# Cria os diretórios no host se não existirem
if [ ! -d "$data_path_host/conf" ]; then
  echo "### Criando diretório $data_path_host/conf para dados do Certbot..."
  mkdir -p "$data_path_host/conf"
  if [ $? -ne 0 ]; then
    echo "Erro: Não foi possível criar o diretório $data_path_host/conf."
    exit 1
  fi
fi

if [ ! -d "$data_path_host/www" ]; then
  echo "### Criando diretório $data_path_host/www para desafios ACME..."
  mkdir -p "$data_path_host/www"
  if [ $? -ne 0 ]; then
    echo "Erro: Não foi possível criar o diretório $data_path_host/www."
    exit 1
  fi
fi

if [ "$email" == "seu-email-aqui@exemplo.com" ] || [ -z "$email" ]; then # Adicionada verificação de email vazio
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  echo "!!! POR FAVOR, EDITE ESTE SCRIPT (scripts/init-letsencrypt.sh) E INSIRA SEU E-MAIL  !!!"
  echo "!!! na variável 'email' antes de continuar.                                         !!!"
  echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
  exit 1
fi

# --- Parar e remover contêineres Nginx e Certbot existentes (se houver) ---
echo "### Parando e removendo contêineres Nginx e Certbot existentes (se houver)..."
docker compose stop nginx certbot > /dev/null 2>&1
docker compose rm -f nginx certbot > /dev/null 2>&1

# --- Gerar um certificado dummy para o Nginx iniciar ---
dummy_cert_dir_container="/etc/letsencrypt/live/$main_domain"
dummy_key_path_container="$dummy_cert_dir_container/privkey.pem"
dummy_cert_path_container="$dummy_cert_dir_container/fullchain.pem"
mkdir -p "$data_path_host/conf/live/$main_domain"

echo "### Gerando certificado dummy para $main_domain..."
MSYS_NO_PATHCONV=1 docker compose run --rm --entrypoint "openssl" certbot \
  req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout "$dummy_key_path_container" \
    -out "$dummy_cert_path_container" \
    -subj "/CN=localhost"

if [ $? -ne 0 ]; then
  echo "Erro: Falha ao gerar certificado dummy."
  exit 1
else
  echo "Certificado dummy aparentemente gerado para $main_domain. Verifique a existência em $data_path_host/conf/live/$main_domain"
fi

# --- Iniciar Nginx ---
echo "### Iniciando o Nginx em segundo plano..."
docker compose up -d nginx
if [ $? -ne 0 ]; then
  echo "Erro: Falha ao iniciar o Nginx com docker compose."
  echo "Limpando certificado dummy (se existir)..."
  rm -rf "$data_path_host/conf/live/$main_domain"
  rm -rf "$data_path_host/conf/archive/$main_domain"
  rm -rf "$data_path_host/conf/renewal/${main_domain}.conf"
  exit 1
fi

echo "### Aguardando Nginx iniciar (10 segundos)..."
sleep 10

# --- Remover certificado dummy ---
echo "### Removendo certificado dummy antes de solicitar o real para $main_domain..."
MSYS_NO_PATHCONV=1 docker compose run --rm --entrypoint "rm" certbot \
  -Rf "/etc/letsencrypt/live/$main_domain" \
        "/etc/letsencrypt/archive/$main_domain" \
        "/etc/letsencrypt/renewal/${main_domain}.conf"

if [ $? -ne 0 ]; then
  echo "Aviso: Falha ao remover completamente o certificado dummy via Certbot. Isso pode não ser crítico se os arquivos não existiam."
else
  echo "Comando para remover certificado dummy para $main_domain executado."
fi

# --- Preparar argumentos para Certbot ---
certbot_domains_args=""
for domain in "${domains[@]}"; do
  certbot_domains_args="$certbot_domains_args -d $domain"
done

echo "### Solicitando certificado Let's Encrypt (staging)..."
#staging_arg="--staging"
 staging_arg=""

docker compose run --rm --entrypoint certbot certbot \
  certonly --webroot -w /var/www/certbot \
    $staging_arg \
    $certbot_domains_args \
    --email $email \
    --rsa-key-size 4096 \
    --agree-tos \
    --non-interactive \
    --force-renewal

if [ $? -ne 0 ]; then
  echo "-------------------------------------------------------------------------------------"
  echo "ERRO: Falha ao obter certificado de STAGING do Let's Encrypt."
  echo "Verifique os logs acima para detalhes."
  echo "Possíveis causas:"
  echo "  - O Nginx não está rodando ou não está acessível publicamente na porta 80."
  echo "  - Os registros DNS para ${domains[*]} não estão apontando corretamente para este servidor."
  echo "  - Limites de taxa do Let's Encrypt (se você executou muitas vezes recentemente)."
  echo "  - O diretório /var/www/certbot não está sendo servido corretamente pelo Nginx ($data_path_host/www no host)."
  echo "Execute 'docker compose logs nginx' e verifique a saída do comando certbot acima."
  echo "-------------------------------------------------------------------------------------"
  docker compose stop nginx > /dev/null 2>&1
  exit 1
else
  echo "-------------------------------------------------------------------------------------"
  echo "SUCESSO: Certificado de STAGING obtido com sucesso para ${domains[*]}!"
  echo "Se tudo parece OK, edite o script init-letsencrypt.sh:"
  echo "  1. Comente a linha: staging_arg=\"--staging\""
  echo "  2. Descomente a linha: # staging_arg=\"\" (remova o #)"
  echo "E execute o script novamente para obter o certificado de PRODUÇÃO."
  echo "Lembre-se que o Nginx já está rodando em segundo plano."
  echo "-------------------------------------------------------------------------------------"
fi

# Não paramos o Nginx aqui, pois ele deve continuar rodando com os certificados (dummy ou staging)
# e para a próxima etapa (produção ou uso normal)

echo "### Script init-letsencrypt.sh concluído." 