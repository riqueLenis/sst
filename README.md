sst - sistema de seguranca do trabalho para um cliente

front - react + typescript
back - node.js + express + mysql local

## Backend

O backend foi estruturado com node.js, express, MySQL local, repositórios, autenticação JWT, controle de acesso por perfil, validação por zod e middlewares de segurança.

### Middlewares ativos

- helmet
- cors com allowlist por ambiente
- express-rate-limit
- hpp
- sessão de autenticação via cookie `HttpOnly`
- validacao de payload por recurso
- autenticacao bearer token
- autorizacao por perfil
- tratamento centralizado de erros

### Scripts

- `npm run backend:dev`
- `npm run backend:start`

### Persistencia

- banco MySQL local em `localhost:3306`, database `sst`
- repositórios para todos os domínios de negócio
- o sistema inicia sem dados fictícios

### Schema SQL

- arquivo de schema em `backend/db/schema.mysql.sql`
- importacao via CLI: `mysql -h localhost -P 3306 -u root -p < backend/db/schema.mysql.sql`
- depois de importar, suba o backend uma vez para criar as tabelas e operar com dados reais
- se o banco já recebeu dados fictícios antigos, execute `backend/db/cleanup.mock-data.sql`

### Recursos expostos

- `/api/auth/login`
- `/api/auth/me`
- `/api/auth/logout`
- `/api/companies`
- `/api/sectors`
- `/api/roles`
- `/api/employees`
- `/api/ppes`
- `/api/ppe-deliveries`
- `/api/transactions`
- `/api/documents`
- `/api/asos`
- `/api/absences`
- `/api/referrals`

### Frontend

O frontend agora consome a API autenticada sem expor o token em `localStorage`; a sessão do navegador fica em cookie `HttpOnly` emitido pelo backend.

### Regras atuais de acesso

- o perfil `tecnico` visualiza apenas `Estoque de EPIs` e `Entregas de EPI`
- o perfil `tecnico` pode somente cadastrar novos EPIs no estoque
- entregas, devoluções e demais cadastros ficam sob responsabilidade do `gestor` ou `admin`

### Deploy em produção (api.exingroup.com.br)

1. Copie `.env.production.example` para `.env` no servidor e preencha as credenciais do MySQL criadas no painel (não use `root`).
2. Gere um `JWT_SECRET` novo: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
3. Mantenha `NODE_ENV=production`, `TRUST_PROXY=true` (backend atrás de proxy/HTTPS), `AUTH_COOKIE_SECURE=true`.
4. Garanta que o banco (`MYSQL_DATABASE`) já exista — em produção o `MYSQL_AUTO_CREATE_DATABASE` fica desligado.
5. Suba o backend: `npm run backend:start`. Na primeira execução, com o banco sem usuários, o sistema cria automaticamente o admin inicial.
6. Faça login com o admin inicial e **troque a senha imediatamente** (crie um novo admin em `Acessos` e desative/rotacione o padrão).

**Admin inicial:** definido por `BOOTSTRAP_ADMIN_USERNAME` / `BOOTSTRAP_ADMIN_PASSWORD` (padrão `admin` / `Exin@2025Admin`). Ele só é criado quando a tabela `users` está vazia; para desligar, use `BOOTSTRAP_ADMIN_ENABLED=false`.

### Observacoes importantes

- os dados persistem entre reinicializações porque agora ficam no MySQL local
- o `.env` local já foi configurado com `MYSQL_HOST=localhost`, `MYSQL_USER=root`, `MYSQL_PASSWORD=lenis`, `MYSQL_DATABASE=sst`
- o backend e o frontend não carregam mais dados de exemplo automaticamente
- o login do navegador usa cookie `HttpOnly`; se precisar ajustar o nome/comportamento do cookie, use `AUTH_COOKIE_NAME`, `AUTH_COOKIE_SECURE` e `AUTH_COOKIE_SAME_SITE`
- em produção, troque `JWT_SECRET` e ajuste `CORS_ORIGIN` caso o frontend rode em um dominio diferente de `api.exingroup.com.br`
- sem `VITE_API_BASE_URL`, o frontend usa `http://localhost:4000` quando aberto em localhost e `https://api.exingroup.com.br` fora do ambiente local
- `VITE_API_PROXY_TARGET` fica apontado para `http://localhost:4000` para manter o fluxo de desenvolvimento local