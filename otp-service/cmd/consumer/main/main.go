package main

import (
	"log"
	"log/slog"
	emailUC "oauth2/otp/internal/application/usecase/email"
	otpUC "oauth2/otp/internal/application/usecase/otp"
	"oauth2/otp/internal/domain/valueobject"
	"oauth2/otp/internal/infra/config"
	"oauth2/otp/internal/infra/messaging/rabbitmq"
	emailHandlerLib "oauth2/otp/internal/interfaces/amqp/email"
	otpHandlerLib "oauth2/otp/internal/interfaces/amqp/otp"
	"os"
	"os/signal"
	"path/filepath"
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

	salt, err := valueobject.ReadSalt()
	if err != nil {
		log.Fatal("Erro ao carregar salt: " + err.Error())
	}

	slog.Info("Configuração de infraestrutura finalizada", "salt_file", valueobject.SaltFilePath())
	// ----------------------------------------------------------------------------

	// INICIALIZAÇÃO DOS USECASES
	// ----------------------------------------------------------------------------
	slog.Info("Instanciando usecases")

	emailValidateUsecase := emailUC.NewValidateUsecase(salt)
	otpCreateUsecase := otpUC.NewCreateUsecase(salt)
	otpCreateWithXDigitsUsecase := otpUC.NewCreateWithXDigitsUsecase(salt)
	otpValidateUsecase := otpUC.NewValidateUsecase(salt)
	// ----------------------------------------------------------------------------

	// INICIALIZAÇÃO DOS HANDLER BUILDERS
	// ----------------------------------------------------------------------------
	slog.Info("Instanciando handler builders")
	// ----------------------------------------------------------------------------

	// INICIALIZAÇÃO DOS CONSUMERS
	// ----------------------------------------------------------------------------
	slog.Info("Subindo consumers")

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	consumers := []consumerConfig{
		{
			Queue:        "email.validate.queue",
			ConsumerName: "otp-service.consumer.email.validate",
			HandlerBuilder: func(publisher *rabbitmq.Publisher) func(rbmq.Delivery) {
				return emailHandlerLib.NewHandler(emailValidateUsecase, nil, publisher).ValidateEmail
			},
		},
		{
			Queue:        "otp.create.queue",
			ConsumerName: "otp-service.consumer.otp.create",
			HandlerBuilder: func(publisher *rabbitmq.Publisher) func(rbmq.Delivery) {
				return otpHandlerLib.NewHandler(otpCreateUsecase, otpCreateWithXDigitsUsecase, otpValidateUsecase, publisher).CreateOtp
			},
		},
		{
			Queue:        "otp.create.withXdigits.queue",
			ConsumerName: "otp-service.consumer.otp.create-with-x-digits",
			HandlerBuilder: func(publisher *rabbitmq.Publisher) func(rbmq.Delivery) {
				return otpHandlerLib.NewHandler(otpCreateUsecase, otpCreateWithXDigitsUsecase, otpValidateUsecase, publisher).CreateOtpWithXDigits
			},
		},
		{
			Queue:        "otp.validate.queue",
			ConsumerName: "otp-service.consumer.otp.validate",
			HandlerBuilder: func(publisher *rabbitmq.Publisher) func(rbmq.Delivery) {
				return otpHandlerLib.NewHandler(otpCreateUsecase, otpCreateWithXDigitsUsecase, otpValidateUsecase, publisher).ValidateOtp
			},
		},
	}

	for _, consumer := range consumers {
		go monitorConsumer(rbmqConfig, consumer)
	}

	slog.Info("Consumers iniciados", "quantidade", len(consumers))
	<-stop
	slog.Info("Finalizando consumer")
	// ----------------------------------------------------------------------------
}

type consumerConfig struct {
	Queue          string
	ConsumerName   string
	HandlerBuilder func(publisher *rabbitmq.Publisher) func(rbmq.Delivery)
}

func monitorConsumer(rbmqConfig *config.RabbitMQConfig, cfg consumerConfig) {
	backoff := time.Second

	for {
		if err := consume(rbmqConfig, cfg); err != nil {
			slog.Error("Consumer parou, tentando reconectar",
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

func consume(rbmqConfig *config.RabbitMQConfig, cfg consumerConfig) error {
	connection, err := rabbitmq.InitializeRBMQInfra(rbmqConfig)
	if err != nil {
		return err
	}
	defer connection.Close()

	consumer := rabbitmq.NewConsumer(connection)
	publisher := rabbitmq.NewPublisher(connection)
	handler := cfg.HandlerBuilder(publisher)

	slog.Info("Consumer conectado", "queue", cfg.Queue, "consumer", cfg.ConsumerName)
	return consumer.Consume(cfg.Queue, cfg.ConsumerName, false, handler)
}

func getEnvPath() string {
	if envPath, exists := os.LookupEnv("ENV_FILE_PATH"); exists {
		return envPath
	}

	if cwd, err := os.Getwd(); err == nil {
		return filepath.Join(cwd, ".env")
	}

	if userProfile, exists := os.LookupEnv("USERPROFILE"); exists {
		return filepath.Join(userProfile, "simple-oauth2-server", "otp-service", ".env")
	}

	log.Fatal("Erro ao localizar o arquivo .env")
	return ""
}
