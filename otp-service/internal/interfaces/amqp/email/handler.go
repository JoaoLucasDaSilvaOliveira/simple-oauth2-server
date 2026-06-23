package email

import (
	"encoding/json"
	command "oauth2/otp/internal/application/command/email"
	usecase "oauth2/otp/internal/application/usecase/email"
	"oauth2/otp/internal/domain/entity"
	"oauth2/otp/internal/domain/valueobject"
	"oauth2/otp/internal/infra/messaging/rabbitmq"

	rbmq "github.com/rabbitmq/amqp091-go"
)

type Handler struct {
	validateUC         *usecase.ValidateUsecase
	sendNotificationUC *usecase.SendNotificationUsecase
	publisher          *rabbitmq.Publisher
}

func NewHandler(validate *usecase.ValidateUsecase, sendNotificationUC *usecase.SendNotificationUsecase, publisher *rabbitmq.Publisher) *Handler {
	return &Handler{
		validateUC:         validate,
		publisher:          publisher,
		sendNotificationUC: sendNotificationUC,
	}
}

func (h *Handler) ValidateEmail(msg rbmq.Delivery) {
	//try to parse the message to request object
	request := new(ValidateEmailRequest)
	if err := json.Unmarshal(msg.Body, request); err != nil {
		//no chance to return something usefull, goes to dlq
		msg.Nack(false, false)
		return
	}

	requestID, err := valueobject.ValidateUUID(request.RequestID)
	if err != nil {
		//no chance to return something usefull, goes to dlq
		msg.Nack(false, false)
		return
	}

	//turn request into a command
	cmd := command.ValidateCommand{
		ClientID: requestID,
		RawEmail: request.RawEmail,
	}

	validEmailDTO, invalidEmailDTO := h.validateUC.Execute(cmd)

	//publish the results
	if invalidEmailDTO != nil {
		//turn result into a response
		responseFail := ValidateEmailResponseFail{
			RequestID:    invalidEmailDTO.ClientID,
			Email:        invalidEmailDTO.Email,
			ErrorMessage: invalidEmailDTO.Message,
		}
		//publish invalidEmailDTO do email.result.queue
		if err := h.publisher.Publish("email", "validate.result", responseFail); err != nil {
			msg.Nack(false, true)
			return
		}
		msg.Ack(false)
		return
	}

	//turn result into a response
	responseSuccess := ValidateEmailResponseSucess{
		RequestID: validEmailDTO.ClientID,
		Email:     validEmailDTO.Email.String(),
		Hash:      validEmailDTO.Hash,
	}

	//publish validEmailDTO do email.result.queue
	if err := h.publisher.Publish("email", "validate.result", responseSuccess); err != nil {
		msg.Nack(false, true)
		return
	}

	msg.Ack(false)
}

func (h *Handler) SendNotification(msg rbmq.Delivery) {
	//try to parse the message to request object
	request := new(SendNotificationRequest)
	if err := json.Unmarshal(msg.Body, request); err != nil {
		//no chance to return something usefull, goes to dlq
		msg.Nack(false, false)
		return
	}

	if _, err := valueobject.ValidateUUID(request.RequestID); err != nil {
		//no chance to return something usefull, goes to dlq
		msg.Nack(false, false)
		return
	}

	//parse email
	parsedEmail, err := entity.NewEmail(request.Email)

	if err != nil {
		//no chance to return something usefull, goes to dlq
		msg.Nack(false, false)
		return
	}

	//turn request into a command
	cmd := command.SendNotification{
		EmailToSend: parsedEmail,
		Hash:        request.Hash,
		OtpCode:     request.OtpCode,
	}

	done := h.sendNotificationUC.Execute(cmd)

	if !done {
		msg.Nack(false, false)
		return
	}

	msg.Ack(false)
}
