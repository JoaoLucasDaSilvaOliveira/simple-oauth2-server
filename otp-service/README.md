# Simple OAuth2 server

![Go](https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)

In this current project was developed a authentication server for third-party services based on OAuth2.0 protocol. The intention is to create a authentication server as Google, Facebook and similar. Will be used the microservices format for division of responsabilities, horizontal escalability and fail resistance.

## Comunication
#### RabbitMQ (cloudAMQP)
#### Queues
| otp | email |
|:---:| :---:| 
| otp.create.queue | email.validate.queue |
| otp.create.withXdigits.queue | email.valids.queue |
| otp.create.validated.queue | email.invalids.queue |
| otp.create.invalidated.queue | email.dlq |
| otp.create.dlq |

#### Exchanges
- otp
  - routing keys
    - otp.create
    - otp.create.withXdigits
    - otp.validateds
    - otp.invalidateds
    - otp.dlx
- email
  - routing keys
    - email.validate
    - email.valids
    - email.invalids
    - email.dlx