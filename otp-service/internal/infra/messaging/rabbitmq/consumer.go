package rabbitmq

import (
	"fmt"
	rbmq "github.com/rabbitmq/amqp091-go"
)

type Consumer struct {
	connection *rbmq.Connection
}

func (c *Consumer) Consume(queue string, consumerName string, autoAck bool, handler func(msg rbmq.Delivery)) error {
	//open channel
	ch, err := OpenChannel(c.connection)

	if err != nil {
		return err
	}
	defer ch.Close()

	if err := ch.Qos(1, 0, false); err != nil {
		return fmt.Errorf("erro ao configurar o canal com o rabbitmq: %w", err)
	}

	msgs, err := ch.Consume(
		queue,
		consumerName,
		autoAck,
		false,
		false, 
		false,
		nil,
	)

	if err != nil {
		return fmt.Errorf("erro ao se inscrever como consumidor: %w", err)
	}

	for msg := range msgs {
		handler(msg)
	}

	return nil
}
