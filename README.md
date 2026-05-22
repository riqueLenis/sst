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
- seed inicial de dados e usuários

### Schema SQL

- arquivo de schema em `backend/db/schema.mysql.sql`
- importacao via CLI: `mysql -h localhost -P 3306 -u root -p < backend/db/schema.mysql.sql`
- depois de importar, suba o backend uma vez para popular seeds e usuarios padrao

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

O frontend agora consome a API autenticada e nao depende mais do `localStorage` do `AppContext` para manter o estado principal do sistema.

### Usuarios seed para desenvolvimento

- `admin / Admin@123`
- `gestor / Gestor@123`
- `tecnico / Tecnico@123`

### Regras atuais de acesso

- o perfil `tecnico` visualiza apenas `Estoque de EPIs` e `Entregas de EPI`
- o perfil `tecnico` pode somente cadastrar novos EPIs no estoque
- entregas, devoluções e demais cadastros ficam sob responsabilidade do `gestor` ou `admin`

### Observacoes importantes

- os dados persistem entre reinicializações porque agora ficam no MySQL local
- o `.env` local já foi configurado com `MYSQL_HOST=localhost`, `MYSQL_USER=root`, `MYSQL_PASSWORD=lenis`, `MYSQL_DATABASE=sst`
- em produção, troque `JWT_SECRET` e ajuste `CORS_ORIGIN` caso o frontend rode em um dominio diferente de `api.exingroup.com.br`
- sem `VITE_API_BASE_URL`, o frontend usa `http://localhost:4000` quando aberto em localhost e `https://api.exingroup.com.br` fora do ambiente local
- `VITE_API_PROXY_TARGET` fica apontado para `http://localhost:4000` para manter o fluxo de desenvolvimento local