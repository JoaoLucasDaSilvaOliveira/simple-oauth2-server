package rabbitmq

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	rbmq "github.com/rabbitmq/amqp091-go"
)

type Publisher struct {
	connection *rbmq.Connection
}

func NewPublisher(connection *rbmq.Connection) *Publisher {
	return &Publisher{
		connection: connection,
	}
}

func (p *Publisher) Publish(exchange string, routingKey string, message any) error {
	//open channel
	ch, err := OpenChannel(p.connection)

	if err != nil {
		return err
	}
	defer ch.Close()

	//context
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	jsonMsg, err := json.Marshal(message)

	if err != nil {
		return fmt.Errorf("não foi possível criar um JSON com a mensagem: %w", err)
	}

	pub := rbmq.Publishing{
		ContentType: "application/json",
		Body:        jsonMsg,
	}

	//publish the message
	if err := ch.PublishWithContext(ctx, exchange, routingKey, false, false, pub); err != nil {
		return fmt.Errorf("erro ao publicar a mensagem: %w", err)
	}

	return nil
}
