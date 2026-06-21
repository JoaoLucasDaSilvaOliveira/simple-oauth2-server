# login-service

Microsservico intermediario de login para o trabalho de OAuth2 simplificado.

Ele recebe `email` e `senha`, valida os dados de entrada, chama um Auth Service externo e devolve o token retornado. Este servico nao cria usuario, nao usa banco de dados e nao gera JWT.

## Objetivo

O objetivo deste servico e ficar entre o cliente e o Auth Service principal.

- O cliente envia `email` e `senha`
- O `login-service` valida os campos
- O `login-service` chama o Auth Service externo
- O `login-service` devolve o token ou o erro recebido

## Requisitos

- Node.js
- npm

## Instalacao

```bash
cd login-service
npm install
```

## Como rodar

```bash
npm run dev
```

O servidor sobe na porta definida em `PORT`.

## Variaveis de ambiente

Copie o arquivo de exemplo para um arquivo `.env`:

```bash
PORT=3000
AUTH_SERVICE_URL=http://localhost:4000
USE_AUTH_MOCK=true
```

### Explicacao das variaveis

- `PORT`: porta do `login-service`
- `AUTH_SERVICE_URL`: endereco do Auth Service real
- `USE_AUTH_MOCK`: alterna entre mock (`true`) e Auth Service real (`false`)

## Como testar no Postman, Insomnia ou Thunder Client

1. Crie uma requisicao `POST`
2. Use a URL `http://localhost:3000/api/login`
3. Adicione o header `Content-Type: application/json`
4. Envie um body JSON com `email` e `senha`

### Exemplo de request de sucesso

```json
{
  "email": "teste@email.com",
  "senha": "123456"
}
```

### Exemplo de response de sucesso

```json
{
  "accessToken": "mock_access_token_123",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

### Exemplo de response de erro

```json
{
  "message": "Credenciais invalidas"
}
```

## Modo mock

O modo mock existe para permitir testes enquanto o Auth Service real ainda nao esta pronto.

Quando `USE_AUTH_MOCK=true`:

- `teste@email.com` com `123456` retorna status `200`
- qualquer outra combinacao retorna status `401`

## Como trocar para o Auth Service real

1. Altere `USE_AUTH_MOCK=false`
2. Configure `AUTH_SERVICE_URL=http://localhost:4000` ou o endereco real do servico
3. Suba o Auth Service no endpoint esperado `POST /api/auth/login`
4. Reinicie o `login-service`

Quando o modo real estiver ativo, o `login-service` repassa o status HTTP e o corpo retornados pelo Auth Service.

## Scripts

- `npm run dev`: inicia o servidor com auto-reload
- `npm start`: inicia o servidor em modo normal
- `npm test`: executa os testes
- `npm run test:coverage`: executa os testes com cobertura
