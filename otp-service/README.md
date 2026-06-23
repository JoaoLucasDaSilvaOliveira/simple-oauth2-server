# OTP Service

![Go](https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)

Serviço de validação de email e geração/validação de OTP para o projeto OAuth2. A comunicação é assíncrona via RabbitMQ: quem consome o serviço publica uma mensagem em uma fila de entrada e recebe o resultado em uma fila de saída usando o mesmo `request_id`.

O serviço é separado em dois binários:

- `consumer`: processa requests públicos de validação de email, criação de OTP e validação de OTP.
- `worker`: processa jobs internos, como envio do código OTP por email.

## Configuração

Variáveis esperadas no `.env`:

```env
RABBITMQ_URL="amqps://user:password@host/vhost"
EMAIL_API_KEY="api-key"
EMAIL_API_URL="https://email-api.example/send"
```

Variáveis opcionais:

```env
ENV_FILE_PATH="/caminho/absoluto/.env"
SALT_FILE_PATH="/caminho/absoluto/.salt"
APP_CONFIG_DIR="/diretorio/de/config"
```

O arquivo `.salt` é usado para assinar hashes internos. Em produção, use um caminho fixo via `SALT_FILE_PATH` ou `APP_CONFIG_DIR`, para manter o mesmo segredo entre deploys.

## Execução

```bash
go run ./cmd/consumer/main
go run ./cmd/worker/main
```

Build:

```bash
go build -o otp-consumer ./cmd/consumer/main
go build -o otp-worker ./cmd/worker/main
```

Os dois processos reconectam automaticamente em caso de falha de rede/RabbitMQ, com backoff progressivo.

## RabbitMQ

### Exchanges

| Exchange | Tipo | Uso |
|:---|:---|:---|
| `email` | direct | validação de email e jobs de envio |
| `otp` | direct | criação e validação de OTP |
| `email.dlx` | direct | dead letter de filas de email |
| `otp.dlx` | direct | dead letter de filas de OTP |

### Filas

| Fila | Consumidor | Tipo |
|:---|:---|:---|
| `email.validate.queue` | `consumer` | pública |
| `email.validate.result.queue` | aplicação cliente | resultado |
| `email.send.email_notification.queue` | `worker` | interna |
| `email.dlq` | operador/suporte | dead letter |
| `otp.create.queue` | `consumer` | pública |
| `otp.create.withXdigits.queue` | `consumer` | pública |
| `otp.create.result.queue` | aplicação cliente | resultado |
| `otp.validate.queue` | `consumer` | pública |
| `otp.validate.result.queue` | aplicação cliente | resultado |
| `otp.dlq` | operador/suporte | dead letter |

### Routing keys

| Exchange | Routing key | Fila |
|:---|:---|:---|
| `email` | `validate` | `email.validate.queue` |
| `email` | `validate.result` | `email.validate.result.queue` |
| `email` | `send.email_notification` | `email.send.email_notification.queue` |
| `email.dlx` | `dlq` | `email.dlq` |
| `otp` | `create` | `otp.create.queue` |
| `otp` | `create.withXdigits` | `otp.create.withXdigits.queue` |
| `otp` | `create.result` | `otp.create.result.queue` |
| `otp` | `validate` | `otp.validate.queue` |
| `otp` | `validate.result` | `otp.validate.result.queue` |
| `otp.dlx` | `dlq` | `otp.dlq` |

## Fluxo Assíncrono

1. Cliente publica em `email` com routing key `validate`.
2. Serviço valida o email e publica resposta em `email.validate.result.queue`.
3. Cliente usa o `hash` recebido para pedir criação de OTP em `otp.create.queue` ou `otp.create.withXdigits.queue`.
4. Serviço cria o OTP, publica `otp_hash` e `expiration` em `otp.create.result.queue`, e publica job interno para `email.send.email_notification.queue`.
5. Worker envia o código bruto por email ao usuário.
6. Cliente pede validação em `otp.validate.queue`, enviando o código informado pelo usuário, `otp_hash` e `expiration`.
7. Serviço publica resultado final em `otp.validate.result.queue`.

O código OTP bruto nunca é publicado nas filas de resultado públicas. Ele só trafega na fila interna `email.send.email_notification.queue`.

## Contratos Públicos

Todas as mensagens são JSON e devem usar `content_type = application/json`.

`request_id` deve ser enviado como `string`, contendo um UUID gerado pelo cliente. O handler faz o parse para `uuid.UUID` internamente. Use o mesmo `request_id` para correlacionar request e response.

### Tipos De Campos

| Campo | Tipo | Quem gera | Descrição |
|:---|:---|:---|:---|
| `request_id` | `string` UUID v4 | cliente | Identificador único da operação. Exemplo: `8ab6a1b9-65d5-45e4-a748-6a27d75c3f7d`. |
| `email` | `string` email | cliente/serviço | Email normalizado e validado pelo serviço. |
| `hash` | `string` HMAC | serviço | Prova de que o email foi validado pelo serviço. Usado para criar OTP. |
| `otp_hash` | `string` HMAC | serviço | Hash do OTP gerado. Deve ser guardado pelo cliente para validar o OTP depois. |
| `original_hash` | `string` HMAC | cliente | Mesmo valor recebido como `otp_hash` na criação do OTP. |
| `otp_code` | `string` numérica | serviço/usuário | Código OTP bruto. Só aparece na fila interna de email e na validação enviada pelo cliente. |
| `expiration` | `number` Unix timestamp | serviço | Instante de expiração do OTP em segundos desde Unix epoch. |
| `quantity_digits` | `number` inteiro | cliente | Quantidade de dígitos do OTP. Valores aceitos: `3`, `5`, `6`. |
| `valid` | `boolean` | serviço | Resultado da validação do OTP. |
| `error_message` | `string` | serviço | Descrição do erro quando a operação falha. |

### Validar Email

Publique em:

```text
exchange: email
routing_key: validate
queue: email.validate.queue
```

Request:

```json
{
  "request_id": "8ab6a1b9-65d5-45e4-a748-6a27d75c3f7d",
  "email": "user@example.com"
}
```

Campos do request:

| Campo | Tipo | Obrigatório | Descrição |
|:---|:---|:---|:---|
| `request_id` | `string` UUID v4 | sim | ID gerado pelo cliente para correlacionar request/response. |
| `email` | `string` email | sim | Email que será validado e normalizado. |

Response de sucesso em `email.validate.result.queue`:

```json
{
  "request_id": "8ab6a1b9-65d5-45e4-a748-6a27d75c3f7d",
  "email": "user@example.com",
  "hash": "hash-assinado-pelo-servico"
}
```

Campos do response de sucesso:

| Campo | Tipo | Descrição |
|:---|:---|:---|
| `request_id` | `string` UUID v4 | Mesmo ID enviado no request. |
| `email` | `string` email | Email validado e normalizado. |
| `hash` | `string` HMAC | Token de autorização para criar OTP para esse email. |

Response de erro em `email.validate.result.queue`:

```json
{
  "request_id": "8ab6a1b9-65d5-45e4-a748-6a27d75c3f7d",
  "email": "email-invalido",
  "error_message": "email invalido"
}
```

Campos do response de erro:

| Campo | Tipo | Descrição |
|:---|:---|:---|
| `request_id` | `string` UUID v4 | Mesmo ID enviado no request. |
| `email` | `string` | Email recebido no request. |
| `error_message` | `string` | Motivo da falha. |

Não envie:

- `hash`
- `otp_code`
- `expiration`
- `original_hash`

### Criar OTP

Publique em:

```text
exchange: otp
routing_key: create
queue: otp.create.queue
```

Request:

```json
{
  "request_id": "8ab6a1b9-65d5-45e4-a748-6a27d75c3f7d",
  "email": "user@example.com",
  "hash": "hash-recebido-na-validacao-do-email"
}
```

Campos do request:

| Campo | Tipo | Obrigatório | Descrição |
|:---|:---|:---|:---|
| `request_id` | `string` UUID v4 | sim | ID gerado pelo cliente para correlacionar request/response. |
| `email` | `string` email | sim | Email validado anteriormente. |
| `hash` | `string` HMAC | sim | Valor recebido no response de `email.validate.result.queue`. |

Response de sucesso em `otp.create.result.queue`:

```json
{
  "request_id": "8ab6a1b9-65d5-45e4-a748-6a27d75c3f7d",
  "otp_hash": "hash-do-otp",
  "expiration": 1719160000
}
```

Campos do response de sucesso:

| Campo | Tipo | Descrição |
|:---|:---|:---|
| `request_id` | `string` UUID v4 | Mesmo ID enviado no request. |
| `otp_hash` | `string` HMAC | Hash do OTP criado. Guarde para enviar como `original_hash` na validação. |
| `expiration` | `number` Unix timestamp | Expiração do OTP em segundos desde Unix epoch. |

Response de erro em `otp.create.result.queue`:

```json
{
  "request_id": "8ab6a1b9-65d5-45e4-a748-6a27d75c3f7d",
  "error_message": "email não validado por essa aplicação, por favor valide o email primeiro"
}
```

Campos do response de erro:

| Campo | Tipo | Descrição |
|:---|:---|:---|
| `request_id` | `string` UUID v4 | Mesmo ID enviado no request. |
| `error_message` | `string` | Motivo da falha. |

Não envie:

- `otp_code`
- `quantity_digits`
- `original_hash`

### Criar OTP Com Quantidade De Dígitos

Publique em:

```text
exchange: otp
routing_key: create.withXdigits
queue: otp.create.withXdigits.queue
```

Request:

```json
{
  "request_id": "8ab6a1b9-65d5-45e4-a748-6a27d75c3f7d",
  "email": "user@example.com",
  "hash": "hash-recebido-na-validacao-do-email",
  "quantity_digits": 6
}
```

Campos do request:

| Campo | Tipo | Obrigatório | Descrição |
|:---|:---|:---|:---|
| `request_id` | `string` UUID v4 | sim | ID gerado pelo cliente para correlacionar request/response. |
| `email` | `string` email | sim | Email validado anteriormente. |
| `hash` | `string` HMAC | sim | Valor recebido no response de `email.validate.result.queue`. |
| `quantity_digits` | `number` inteiro | sim | Quantidade de dígitos do OTP. Aceita somente `3`, `5` ou `6`. |

Valores aceitos para `quantity_digits`:

- `3`
- `5`
- `6`

Response de sucesso em `otp.create.result.queue`:

```json
{
  "request_id": "8ab6a1b9-65d5-45e4-a748-6a27d75c3f7d",
  "otp_hash": "hash-do-otp",
  "expiration": 1719160000
}
```

Campos do response de sucesso:

| Campo | Tipo | Descrição |
|:---|:---|:---|
| `request_id` | `string` UUID v4 | Mesmo ID enviado no request. |
| `otp_hash` | `string` HMAC | Hash do OTP criado. Guarde para enviar como `original_hash` na validação. |
| `expiration` | `number` Unix timestamp | Expiração do OTP em segundos desde Unix epoch. |

Response de erro em `otp.create.result.queue`:

```json
{
  "request_id": "8ab6a1b9-65d5-45e4-a748-6a27d75c3f7d",
  "error_message": "quantidade de digitos inválida"
}
```

Campos do response de erro:

| Campo | Tipo | Descrição |
|:---|:---|:---|
| `request_id` | `string` UUID v4 | Mesmo ID enviado no request. |
| `error_message` | `string` | Motivo da falha. |

Não envie:

- `otp_code`
- `original_hash`

### Validar OTP

Publique em:

```text
exchange: otp
routing_key: validate
queue: otp.validate.queue
```

Request:

```json
{
  "request_id": "8ab6a1b9-65d5-45e4-a748-6a27d75c3f7d",
  "email": "user@example.com",
  "otp_code": "123456",
  "expiration": 1719160000,
  "original_hash": "otp_hash-recebido-na-criacao"
}
```

Campos do request:

| Campo | Tipo | Obrigatório | Descrição |
|:---|:---|:---|:---|
| `request_id` | `string` UUID v4 | sim | ID gerado pelo cliente para correlacionar request/response. |
| `email` | `string` email | sim | Mesmo email usado para criar o OTP. |
| `otp_code` | `string` numérica | sim | Código que o usuário recebeu por email e informou ao cliente. |
| `expiration` | `number` Unix timestamp | sim | Valor recebido no response de criação do OTP. |
| `original_hash` | `string` HMAC | sim | Valor recebido como `otp_hash` no response de criação do OTP. |

Response de sucesso em `otp.validate.result.queue`:

```json
{
  "request_id": "8ab6a1b9-65d5-45e4-a748-6a27d75c3f7d",
  "valid": true
}
```

Campos do response de sucesso:

| Campo | Tipo | Descrição |
|:---|:---|:---|
| `request_id` | `string` UUID v4 | Mesmo ID enviado no request. |
| `valid` | `boolean` | `true` quando o OTP é válido. |

Response de erro/OTP inválido em `otp.validate.result.queue`:

```json
{
  "request_id": "8ab6a1b9-65d5-45e4-a748-6a27d75c3f7d",
  "valid": false,
  "error_message": "otp inválido"
}
```

Campos do response de erro:

| Campo | Tipo | Descrição |
|:---|:---|:---|
| `request_id` | `string` UUID v4 | Mesmo ID enviado no request. |
| `valid` | `boolean` | `false` quando o OTP é inválido ou expirou. |
| `error_message` | `string` | Motivo da falha. |

Não envie:

- `hash` da validação de email
- `quantity_digits`

## Mensagens Internas

### Envio De Notificação Por Email

Esta mensagem é interna. Clientes externos não devem publicar nem consumir esta fila.

```text
exchange: email
routing_key: send.email_notification
queue: email.send.email_notification.queue
```

Payload interno:

```json
{
  "request_id": "8ab6a1b9-65d5-45e4-a748-6a27d75c3f7d",
  "email": "user@example.com",
  "hash": "hash-recebido-na-validacao-do-email",
  "otp_code": "123456"
}
```

O `otp_code` bruto só deve existir nessa mensagem e na API externa de email. Não registre esse payload em logs.

## Dead Letter Queues

Mensagens com erro irrecuperável vão para DLQ e não retornam resposta para o cliente.

### Vai Para DLQ E Não Retorna

| Origem | Motivo | DLQ |
|:---|:---|:---|
| `email.validate.queue` | JSON inválido, `request_id` inválido ou payload incompatível | `email.dlq` |
| `email.send.email_notification.queue` | JSON inválido, `request_id` inválido, email inválido, hash inválido ou falha definitiva no envio | `email.dlq` |
| `otp.create.queue` | JSON inválido, `request_id` inválido ou email inválido | `otp.dlq` |
| `otp.create.withXdigits.queue` | JSON inválido, `request_id` inválido ou email inválido | `otp.dlq` |
| `otp.validate.queue` | JSON inválido, `request_id` inválido ou email inválido | `otp.dlq` |

### Não Vai Para DLQ, Retorna Erro

| Origem | Motivo | Fila de retorno |
|:---|:---|:---|
| `email.validate.queue` | email malformado | `email.validate.result.queue` |
| `otp.create.queue` | hash de email inválido | `otp.create.result.queue` |
| `otp.create.withXdigits.queue` | hash de email inválido ou quantidade de dígitos inválida | `otp.create.result.queue` |
| `otp.validate.queue` | OTP inválido ou expirado | `otp.validate.result.queue` |

## Segurança

- Nunca consuma `email.send.email_notification.queue` fora do worker.
- Nunca exponha `otp_code` bruto em resposta pública.
- Restrinja permissões RabbitMQ por usuário/vhost.
- Use TLS no RabbitMQ e na API de email.
- Preserve o mesmo `.salt` entre reinícios/deploys; trocar o salt invalida hashes pendentes.
