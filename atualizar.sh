bash
#!/bin/bash

echo "🤖 Iniciando atualização do FGTS Agent..."

# Registrar data e hora da atualização
echo "=========================" >> atualizacao.log
echo "Atualização iniciada em: $(date)" >> atualizacao.log

# Puxar alterações do repositório
git pull origin main

# Parar serviços
docker-compose down

# Reconstruir imagens
docker-compose build --no-cache api frontend

# Iniciar serviços
docker-compose up -d

# Verificar status
docker-compose ps >> atualizacao.log

# Verificar se há erros nos logs
echo "Verificando logs por erros..." >> atualizacao.log
docker-compose logs --tail=100 nginx >> atualizacao.log
docker-compose logs --tail=100 api >> atualizacao.log

echo "✅ Atualização concluída em: $(date)" >> atualizacao.log
echo "=========================" >> atualizacao.log
echo "Aplicação atualizada com sucesso!"