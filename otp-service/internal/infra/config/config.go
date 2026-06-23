package config

import (
	"errors"
	"os"
)

type RabbitMQConfig struct {
	Url string
}

type EmailSenderApi struct {
	ApiKey, ApiUrl string
}

func LoadRBMQConfig() (*RabbitMQConfig, error) {
	rbmqUrl := os.Getenv("RABBITMQ_URL")

	if rbmqUrl == "" {
		return nil, errors.New("a variavel de ambiente que representa a url do rabbitmq está vazia")
	}
	
	cfg := &RabbitMQConfig{
		Url: rbmqUrl,
	}

	return cfg, nil
}

func LoadEmailSenderApi() (*EmailSenderApi, error) {
	apiKey := os.Getenv("EMAIL_API_KEY")
	apiUrl := os.Getenv("EMAIL_API_URL")

	if apiKey == "" || apiUrl == "" {
		return nil, errors.New("a variavel de ambiente que representa a url ou a chave da api de email está vazia")
	}
	
	cfg := &EmailSenderApi{
		ApiKey: apiKey,
		ApiUrl: apiUrl,
	}

	return cfg, nil
}