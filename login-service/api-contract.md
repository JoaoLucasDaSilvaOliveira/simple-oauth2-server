# API Contract - login-service

## Meu servico

### `POST /api/login`

#### Entrada esperada

```json
{
  "email": "usuario@email.com",
  "senha": "123456"
}
```

#### Resposta de sucesso

```json
{
  "accessToken": "token",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

#### Resposta de erro

```json
{
  "message": "Credenciais invalidas"
}
```

#### Comportamento extra

Quando o login do Auth Service e bem-sucedido, o `login-service` tambem dispara o fluxo de OTP no `otp-service` via RabbitMQ. Se esse fluxo falhar por indisponibilidade do broker ou da fila, a requisicao retorna erro em vez de concluir o login.

## Auth Service esperado

### `POST /api/auth/login`

#### Entrada

```json
{
  "email": "usuario@email.com",
  "senha": "123456"
}
```

#### Resposta de sucesso

```json
{
  "accessToken": "token",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

#### Resposta de erro

```json
{
  "message": "Credenciais invalidas"
}
```
