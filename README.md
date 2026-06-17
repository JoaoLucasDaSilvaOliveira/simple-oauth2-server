# Simple OAuth2 server

![Go](https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)

In this current project was developed a authentication server for third-party services based on OAuth2.0 protocol. The intention is to create a authentication server as Google, Facebook and similar. Will be used the microservices format for division of responsabilities, horizontal escalability and fail resistance.

## Comunication
#### RabbitMQ (cloudAMQP)
#### Queues
- OTP.create.queue
- OTP.create.withXdigits.queue
- OTP.create.validated.queue
- OTP.create.invalidated.queue
- OTP.create.dlq
----
- email.validate.queue
- email.valids.queue
- email.invalids.queue
- email.dlq
#### Exchanges
- OTP
  - Routing keys
    - OTP.create
    - OTP.create.withXdigits
    - OTP.validateds
    - OTP.invalidateds
    - OTP.dlx
- Email
  - email.validate
  - email.valids
  - email.invalids
  - email.dlx

# Servidor OAuth2 simples
Nesse projeto foi desenvolvido um servidor de autenticação para serviços terceiros com base no protocolo OAuth2.0. A intenção criar um servidor de autenticação como Google, Facebook e semelhantes. Será utilizado o formato de microsserviços para divisão de responsabilidades, escalabilidade horizontal e resistência à falhas.

## Comunicação
#### RabbitMQ (cloudAMQP)
#### Queues
- OTP.create.queue
- OTP.create.withXdigits.queue
- OTP.create.validated.queue
- OTP.create.invalidated.queue
- OTP.create.dlq
----
- email.validate.queue
- email.valids.queue
- email.invalids.queue
- email.dlq
#### Exchanges
- OTP
  - Routing keys
    - OTP.create
    - OTP.create.withXdigits
    - OTP.validateds
    - OTP.invalidateds
    - OTP.dlx
- Email
  - email.validate
  - email.valids
  - email.invalids
  - email.dlx