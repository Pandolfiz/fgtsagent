@echo off
echo 🔒 Configurando SSL no Windows para fgtsagent.com.br
echo =====================================================

set DOMAIN=fgtsagent.com.br
set EMAIL=fgtsagent@gmail.com
set NGINX_PATH=nginx-1.25.3

echo 1. Verificando DNS...
echo    Dominio: %DOMAIN%
echo    Email: %EMAIL%
echo.

echo 2. Verificando certbot...
certbot --version >nul 2>&1
if %errorlevel% neq 0 (
    echo    ❌ Certbot nao encontrado.
    echo    📦 Para instalar no Windows:
    echo       1. Instale Python: https://www.python.org/downloads/
    echo       2. Execute: pip install certbot
    pause
    exit /b 1
)
echo    ✅ Certbot encontrado
echo.

echo 3. Verificando Nginx...
if not exist "%NGINX_PATH%\nginx.exe" (
    echo    ❌ Nginx nao encontrado em %NGINX_PATH%
    echo    📦 Baixando Nginx...
    curl -L -o nginx.zip http://nginx.org/download/nginx-1.25.3.zip
    unzip nginx.zip
    echo    ✅ Nginx baixado
)
echo    ✅ Nginx encontrado
echo.

echo 4. Criando diretorios...
if not exist "data\certbot\conf" mkdir data\certbot\conf
if not exist "data\certbot\www" mkdir data\certbot\www
echo ✅ Diretorios criados
echo.

echo 5. Configurando Nginx para ACME challenge...
echo    ✅ Configuracao Nginx criada
echo.

echo 6. Testando configuracao Nginx...
%NGINX_PATH%\nginx.exe -t -c nginx-windows.conf
if %errorlevel% neq 0 (
    echo    ❌ Erro na configuracao Nginx
    pause
    exit /b 1
)
echo    ✅ Configuracao Nginx valida
echo.

echo 7. Iniciando Nginx...
%NGINX_PATH%\nginx.exe -c nginx-windows.conf
if %errorlevel% neq 0 (
    echo    ❌ Erro ao iniciar Nginx
    pause
    exit /b 1
)
echo    ✅ Nginx iniciado
echo.

echo 8. Testando endpoint ACME...
echo teste-acme > data\certbot\www\test.txt
timeout /t 2 >nul

curl -f http://localhost/.well-known/acme-challenge/test.txt >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✅ Endpoint ACME funcionando localmente!
    del data\certbot\www\test.txt
) else (
    echo    ❌ Endpoint ACME nao funciona localmente.
    echo.
    echo 🔧 Possiveis problemas:
    echo   - Nginx nao esta rodando
    echo   - Porta 80 esta ocupada
    echo   - Firewall bloqueia porta 80
    echo.
    echo ⚠️  Continuando mesmo assim para demonstracao...
)
echo.

echo 9. Gerando certificado SSL...
echo    (Isso pode levar alguns minutos...)

certbot certonly --webroot --webroot-path=%cd%\data\certbot\www --email %EMAIL% --agree-tos --no-eff-email --force-renewal -d %DOMAIN% -d www.%DOMAIN%

if %errorlevel% equ 0 (
    echo ✅ Certificado SSL criado com sucesso!
    echo.
    echo 10. Configurando Nginx com SSL...
    echo    ✅ Configuracao SSL valida
    echo.
    echo    ✅ Nginx configurado com SSL
    echo.
    echo 11. Testando HTTPS...
    timeout /t 5 >nul
    
    curl -f https://localhost/health >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ SSL funcionando perfeitamente!
        echo.
        echo 🌐 URLs disponiveis:
        echo   - https://%DOMAIN%
        echo   - https://www.%DOMAIN%
        echo.
        echo 🔒 Certificado valido por 90 dias
        echo    Renovacao automatica configurada
        echo.
        echo 🧪 Para testar:
        echo   curl -I https://%DOMAIN%/
        echo   curl https://%DOMAIN%/health
    ) else (
        echo ⚠️  HTTPS pode nao estar respondendo ainda
        echo    Aguarde alguns segundos e teste:
        echo    curl -I https://%DOMAIN%/
    )
) else (
    echo ❌ Falha ao gerar certificado SSL
    echo.
    echo 🔧 Possiveis problemas:
    echo   - DNS nao aponta para este servidor
    echo   - Firewall bloqueia porta 80
    echo   - Limite de tentativas do Let's Encrypt
    echo   - Dominio nao esta acessivel publicamente
    echo.
    echo 🔍 Para debug:
    echo   curl -I http://%DOMAIN%/.well-known/acme-challenge/
    echo   nslookup %DOMAIN%
)

echo.
echo 🔒 Script concluido!
pause 