# auth-service

Microsservico simples de autenticacao para um trabalho sobre microsservicos.

Ele faz 3 coisas:

- cadastra usuarios no SQLite;
- faz login e gera um token JWT;
- mostra o usuario autenticado pela rota `/api/auth/me`.

O endpoint `POST /api/auth/login` foi feito para ser consumido pelo `login-service`.

## Instalacao

```bash
npm install
```

## Configuracao

Copie o arquivo `.env.example` para `.env`.

Exemplo:

```env
PORT
JWT_SECRET
```

## Como rodar

```bash
npm run dev
```

O servidor sobe em `http://localhost:4000`.

## Usuarios mock

Quando o servico sobe, ele cria automaticamente dois usuarios de demonstracao se eles ainda nao existirem:

- `kaua@email.com` / `123456`
- `maria@email.com` / `123456`

## Rotas

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

## Exemplo de cadastro

`POST /api/auth/register`

```json
{
  "nome": "Kaua Fraga",
  "email": "kaua@email.com",
  "senha": "123456"
}
```

Resposta:

```json
{
  "message": "Usuario cadastrado com sucesso",
  "user": {
    "id": "uuid-do-usuario",
    "nome": "Kaua Fraga",
    "email": "kaua@email.com",
    "ativo": true
  }
}
```

## Exemplo de login

`POST /api/auth/login`

```json
{
  "email": "kaua@email.com",
  "senha": "123456"
}
```

Resposta:

```json
{
  "accessToken": "jwt-gerado-aqui",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

## Exemplo de usuario autenticado

`GET /api/auth/me`

```http
Authorization: Bearer TOKEN_JWT
```

Resposta:

```json
{
  "id": "uuid-do-usuario",
  "nome": "Kaua Fraga",
  "email": "kaua@email.com",
  "ativo": true
}
```

## Integracao com o login-service

O `login-service` chama esta rota do `auth-service`:

```http
POST http://localhost:4000/api/auth/login
```

Por isso, a resposta do login precisa ter este formato:

```json
{
  "accessToken": "jwt-gerado-aqui",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```
