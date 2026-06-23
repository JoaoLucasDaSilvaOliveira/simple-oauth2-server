package rabbitmq

import (
	"fmt"
	"oauth2/otp/internal/infra/config"
	rbmq "github.com/rabbitmq/amqp091-go"
)

type routingKeyRoutingType string

type bind struct {
	exchange   string
	routingKey string
	queues     []string
}

type queue struct {
	name string
	args rbmq.Table
}

var (
	exchanges = []string{
		"otp",
		"email",
		"otp.dlx",
		"email.dlx",
	}
	queues = []queue{
		{name: "otp.create.queue", args: deadLetterArgs("otp.dlx")},
		{name: "email.validate.queue", args: deadLetterArgs("email.dlx")},
		{name: "otp.create.withXdigits.queue", args: deadLetterArgs("otp.dlx")},
		{name: "email.validate.result.queue", args: deadLetterArgs("email.dlx")},
		{name: "otp.create.result.queue", args: deadLetterArgs("otp.dlx")},
		{name: "email.send.email_notification.queue", args: deadLetterArgs("email.dlx")},
		{name: "otp.validate.queue", args: deadLetterArgs("otp.dlx")},
		{name: "email.dlq"},
		{name: "otp.validate.result.queue", args: deadLetterArgs("otp.dlx")},
		{name: "otp.dlq"},
	}
	routingKeys = []string{
		"validate",
		"validate.result",
		"dlq",
		"create",
		"create.withXdigits",
		"create.result",
	}
	binds = []bind{
		{
			exchange:   "email",
			routingKey: "validate",
			queues:     []string{"email.validate.queue"},
		},
		{
			exchange:   "email",
			routingKey: "validate.result",
			queues:     []string{"email.validate.result.queue", "email.send.email_notification.queue"},
		},
		{
			exchange:   "email.dlx",
			routingKey: "dlq",
			queues:     []string{"email.dlq"},
		},
		{
			exchange:   "otp",
			routingKey: "create",
			queues:     []string{"otp.create.queue"},
		},
		{
			exchange:   "otp",
			routingKey: "create.withXdigits",
			queues:     []string{"otp.create.withXdigits.queue"},
		},
		{
			exchange:   "otp",
			routingKey: "create.result",
			queues:     []string{"otp.create.result.queue"},
		},
		{
			exchange:   "otp",
			routingKey: "validate",
			queues:     []string{"otp.validate.queue"},
		},
		{
			exchange:   "otp",
			routingKey: "validate.result",
			queues:     []string{"otp.validate.result.queue"},
		},
		{
			exchange:   "otp.dlx",
			routingKey: "dlq",
			queues:     []string{"otp.dlq"},
		},
	}
)

func OpenChannel(conn *rbmq.Connection) (*rbmq.Channel, error) {
	ch, err := conn.Channel()
	if err != nil {
		return nil, fmt.Errorf("erro ao criar um canal de comunicação: %w", err)
	}

	return ch, nil
}

func StartConnection (rmbqUrl string) (*rbmq.Connection, error) {
	conn, err := rbmq.Dial(rmbqUrl)
	if err != nil {
		return nil, fmt.Errorf("erro ao conectar no RabbitMQ: %w", err)
	}

	return conn, nil
}

func InitializeRBMQInfra(cfg *config.RabbitMQConfig) (*rbmq.Connection, error) {
	//connects on rabbitmq server
	conn, err := StartConnection(cfg.Url)
	if err != nil {
		return nil, fmt.Errorf("erro ao conectar no RabbitMQ: %w", err)
	}
	
	// create a channel for comunication inside the existance conection
	ch, err := OpenChannel(conn)
	if err != nil {
		return nil, err
	}
	defer ch.Close()

	if err := declareExchanges(ch); err != nil {
		return nil, err
	}

	if err := declareQueues(ch); err != nil {
		return nil, err
	}

	if err := declareBinds(ch); err != nil {
		return nil, err
	}
	
	return conn, nil
}

func declareExchanges(ch *rbmq.Channel) error {
	for _, exchange := range exchanges {
		err := ch.ExchangeDeclare(
			exchange,
			rbmq.ExchangeDirect,
			true,
			false,
			false,
			false,
			nil,
		)
		if err != nil {
			return fmt.Errorf("erro ao declarar a exchange %s: %w", exchange, err)
		}
	}

	return nil
}

func declareQueues(ch *rbmq.Channel) error {
	for _, queue := range queues {
		_, err := ch.QueueDeclare(
			queue.name,
			true,
			false,
			false,
			false,
			queue.args,
		)
		if err != nil {
			return fmt.Errorf("erro ao declarar a fila %s: %w", queue.name, err)
		}
	}

	return nil
}

func declareBinds(ch *rbmq.Channel) error {
	for _, bind := range binds {
		for _, queue := range bind.queues {
			err := ch.QueueBind(
				queue,
				bind.routingKey,
				bind.exchange,
				false,
				nil,
			)
			if err != nil {
				return fmt.Errorf("erro ao declarar o bind que liga %s a %s: %w", bind.exchange, queue, err)
			}
		}
	}

	return nil
}

func deadLetterArgs(exchange string) rbmq.Table {
	return rbmq.Table{
		"x-dead-letter-exchange":    exchange,
		"x-dead-letter-routing-key": "dlq",
	}
}
