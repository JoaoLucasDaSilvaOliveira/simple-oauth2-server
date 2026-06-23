package config

import (
	"errors"
	"os"
)

type RabbitMQConfig struct {
	Url string
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