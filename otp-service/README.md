# Simple OAuth2 server

![Go](https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)

In this current project was developed a authentication server for third-party services based on OAuth2.0 protocol. The intention is to create a authentication server as Google, Facebook and similar. Will be used the microservices format for division of responsabilities, horizontal escalability and fail resistance.

## Comunication
#### RabbitMQ (cloudAMQP)
#### Queues
| otp | email |
|:---| :---| 
| otp.create.queue | email.validate.queue |
| otp.create.withXdigits.queue | email.validate.result.queue |
| otp.create.result.queue | email.send.email_notification.queue |
| otp.validate.queue | email.dlq |
| otp.validate.result.queue | |
| otp.dlq | |

#### Exchanges
- otp
- email
- otp.dlx
- email.dlx

#### Queues and Routing keys
- routing keys: email
  - validate -> email.validate.queue
  - validate.result -> email.validate.result.queue
  - send.email_notification -> email.send.email_notification.queue

- routing keys: otp
  - create -> otp.create.queue
  - create.withXdigits -> otp.create.withXdigits.queue
  - create.result -> otp.create.result.queue
  - validate -> otp.validate.queue
  - validate.result -> otp.validate.result.queue

#### Dead letter routing
- email queues use `x-dead-letter-exchange: email.dlx` and `x-dead-letter-routing-key: dlq`
  - email.dlx + dlq -> email.dlq
- otp queues use `x-dead-letter-exchange: otp.dlx` and `x-dead-letter-routing-key: dlq`
  - otp.dlx + dlq -> otp.dlq
