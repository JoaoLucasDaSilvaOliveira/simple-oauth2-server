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
