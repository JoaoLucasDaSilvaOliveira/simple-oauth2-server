package main

import (
	"log"
	"log/slog"
	emailUC "oauth2/otp/internal/application/usecase/email"
	"oauth2/otp/internal/domain/valueobject"
	"oauth2/otp/internal/infra/config"
	"oauth2/otp/internal/infra/httpclient"
	"oauth2/otp/internal/infra/messaging/rabbitmq"
	emailHandlerLib "oauth2/otp/internal/interfaces/amqp/email"
	"os"
	"os/signal"
	"path"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	rbmq "github.com/rabbitmq/amqp091-go"
)

func main() {
	// LOAD DAS CONFIGURAÇÕES BASICAS
	// ----------------------------------------------------------------------------
	slog.Info("Carregando .env")

	envPath := getEnvPath()

	if err := godotenv.Load(envPath); err != nil {
		log.Fatal("Ocorreu um erro ao carregar o arquivo .env principal: " + err.Error())
	}

	slog.Info("Carregamento finalizado")
	// ----------------------------------------------------------------------------

	// LOAD DAS CONFIGURAÇÕES DE INFRA
	// ----------------------------------------------------------------------------
	slog.Info("Iniciando configuração de infraestrutura")

	rbmqConfig, err := config.LoadRBMQConfig()
	if err != nil {
		log.Fatal("Erro ao carregar configuração do RabbitMQ: " + err.Error())
	}

	emailSenderConfig, err := config.LoadEmailSenderApi()
	if err != nil {
		log.Fatal("Erro ao carregar configuração da API de email: " + err.Error())
	}

	salt, err := valueobject.ReadSalt()
	if err != nil {
		log.Fatal("Erro ao carregar salt: " + err.Error())
	}

	slog.Info("Configuração de infraestrutura finalizada", "salt_file", valueobject.SaltFilePath())
	// ----------------------------------------------------------------------------

	// INICIALIZAÇÃO DOS CLIENTS
	// ----------------------------------------------------------------------------
	slog.Info("Instanciando clients")

	emailSender := httpclient.NewEmailSenderObject(emailSenderConfig)
	// ----------------------------------------------------------------------------

	// INICIALIZAÇÃO DOS USECASES
	// ----------------------------------------------------------------------------
	slog.Info("Instanciando usecases")

	sendNotificationUsecase := emailUC.NewSendNotificationUsecase(salt, emailSender)
	// ----------------------------------------------------------------------------

	// INICIALIZAÇÃO DOS CONSUMERS
	// ----------------------------------------------------------------------------
	slog.Info("Subindo worker")

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	worker := workerConfig{
		Queue:        "email.send.email_notification.queue",
		ConsumerName: "otp-service.worker.email.send-notification",
		HandlerBuilder: func(publisher *rabbitmq.Publisher) func(rbmq.Delivery) {
			return emailHandlerLib.NewHandler(nil, sendNotificationUsecase, publisher).SendNotification
		},
	}

	go monitorWorker(rbmqConfig, worker)

	slog.Info("Worker iniciado", "queue", worker.Queue)
	<-stop
	slog.Info("Finalizando worker")
	// ----------------------------------------------------------------------------
}

type workerConfig struct {
	Queue          string
	ConsumerName   string
	HandlerBuilder func(publisher *rabbitmq.Publisher) func(rbmq.Delivery)
}

func monitorWorker(rbmqConfig *config.RabbitMQConfig, cfg workerConfig) {
	backoff := time.Second

	for {
		if err := consume(rbmqConfig, cfg); err != nil {
			slog.Error("Worker parou, tentando reconectar",
				"queue", cfg.Queue,
				"consumer", cfg.ConsumerName,
				"erro", err,
				"backoff", backoff,
			)
		}

		time.Sleep(backoff)

		if backoff < 30*time.Second {
			backoff *= 2
		}
	}
}

func consume(rbmqConfig *config.RabbitMQConfig, cfg workerConfig) error {
	connection, err := rabbitmq.InitializeRBMQInfra(rbmqConfig)
	if err != nil {
		return err
	}
	defer connection.Close()

	consumer := rabbitmq.NewConsumer(connection)
	publisher := rabbitmq.NewPublisher(connection)
	handler := cfg.HandlerBuilder(publisher)

	slog.Info("Worker conectado", "queue", cfg.Queue, "consumer", cfg.ConsumerName)
	return consumer.Consume(cfg.Queue, cfg.ConsumerName, false, handler)
}

func getEnvPath() string {
	if envPath, exists := os.LookupEnv("ENV_FILE_PATH"); exists {
		return envPath
	}

	baseDir, exists := os.LookupEnv("HOME")
	if !exists {
		log.Fatal("Erro ao carregar a $HOME")
	}

	return path.Join(baseDir, "MATERIAS ADS IFRS/5 SEMESTRE/SISTEMAS_DISTRIBUIDOS/OAuth2_Simple_Project/otp-service/.env")
}
