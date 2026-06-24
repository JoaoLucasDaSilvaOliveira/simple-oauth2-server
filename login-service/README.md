# login-service

Microsservico intermediario de login para o trabalho de OAuth2 simplificado.

Ele recebe `email` e `senha`, valida os dados de entrada, chama um Auth Service externo e devolve o token retornado. Este servico nao cria usuario, nao usa banco de dados e nao gera JWT.

## Objetivo

O objetivo deste servico e ficar entre o cliente e o Auth Service principal.

- O cliente envia `email` e `senha`
- O `login-service` valida os campos
- O `login-service` chama o Auth Service externo
- Depois de um login bem-sucedido, o `login-service` dispara o fluxo de OTP no `otp-service`
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
PORT=0000
AUTH_SERVICE_URL=http://localhost:4000
RABBITMQ_URL=amqps://user:password@host/vhost
OTP_FLOW_TIMEOUT_MS=5000
```

### Explicacao das variaveis

- `PORT`: porta do `login-service`
- `AUTH_SERVICE_URL`: endereco do Auth Service real
- `RABBITMQ_URL`: endereco do RabbitMQ usado para falar com o `otp-service`
- `OTP_FLOW_TIMEOUT_MS`: tempo maximo, em milissegundos, para concluir o fluxo de OTP apos o login

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
  "accessToken": "jwt-gerado-aqui",
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

## Integracao com o otp-service

Depois que o Auth Service responde com sucesso, o `login-service` publica as mensagens esperadas pelo `otp-service`:

1. envia `email.validate` com `request_id` e `email`
2. aguarda `email.validate.result.queue`
3. envia `otp.create` com `request_id`, `email` e `hash`
4. aguarda `otp.create.result.queue`

Se o fluxo de OTP falhar por indisponibilidade da fila ou do broker, o `login-service` responde com erro e nao conclui o login.

## Como trocar para o Auth Service real

1. Configure `AUTH_SERVICE_URL=http://localhost:4000` ou o endereco real do servico
2. Configure `RABBITMQ_URL=amqps://user:password@host/vhost`
3. Suba o Auth Service no endpoint esperado `POST /api/auth/login`
4. Reinicie o `login-service`

O `login-service` repassa o status HTTP e o corpo retornados pelo Auth Service e, quando esse login e bem-sucedido, inicia o fluxo de OTP.

## Scripts

- `npm run dev`: inicia o servidor com auto-reload
- `npm start`: inicia o servidor em modo normal
- `npm test`: executa os testes
- `npm run test:coverage`: executa os testes com cobertura
