package otp

import (
	"encoding/json"
	command "oauth2/otp/internal/application/command/otp"
	usecase "oauth2/otp/internal/application/usecase/otp"
	"oauth2/otp/internal/domain/entity"
	"oauth2/otp/internal/domain/valueobject"
	"oauth2/otp/internal/infra/messaging/rabbitmq"
	emailamqp "oauth2/otp/internal/interfaces/amqp/email"

	"github.com/google/uuid"
	rbmq "github.com/rabbitmq/amqp091-go"
)

type Handler struct {
	createOtpUC          *usecase.CreateUsecase
	createOtpWithXDigits *usecase.CreateWithXDigitsUsecase
	validateOtp          *usecase.ValidateUsecase
	publisher            *rabbitmq.Publisher
}

func NewHandler(createOtpUC *usecase.CreateUsecase, createOtpWithXDigits *usecase.CreateWithXDigitsUsecase, validateOtp *usecase.ValidateUsecase, publisher *rabbitmq.Publisher) *Handler {
	return &Handler{
		createOtpUC:          createOtpUC,
		createOtpWithXDigits: createOtpWithXDigits,
		validateOtp:          validateOtp,
		publisher:            publisher,
	}
}

func (h *Handler) CreateOtp(msg rbmq.Delivery) {
	//try to parse the message to request object
	request := new(CreateOtpRequest)
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

	//parse email
	parsedEmail, err := entity.NewEmail(request.ValidatedEmail)
	if err != nil {
		//no chance to return something usefull, goes to dlq
		msg.Nack(false, false)
		return
	}

	//turn request into a command
	cmd := command.CreateCommand{
		ClientID: requestID,
		Email:    parsedEmail,
		Hash:     request.Hash,
	}

	createdOtpDTO, errorOnCreateOtpDTO := h.createOtpUC.Execute(&cmd)

	//publish the results
	if errorOnCreateOtpDTO != nil {
		//turn result into a response
		responseFail := CreateOtpResponseError{
			RequestID:    requestID,
			ErrorMessage: errorOnCreateOtpDTO.Message,
		}
		//publish errorOnCreateOtpDTO do otp.create.result.queue
		if err := h.publisher.Publish("otp", "create.result", responseFail); err != nil {
			msg.Nack(false, true)
			return
		}
		msg.Ack(false)
		return
	}

	//turn result into a response
	responseSuccess := CreateOtpResponseSuccess{
		RequestID:  createdOtpDTO.ClientID,
		OtpWord:    createdOtpDTO.OtpWord,
		Expiration: createdOtpDTO.Expiration,
	}

	if err := h.publishOtpNotification(requestID, parsedEmail, request.Hash, createdOtpDTO.OtpCode); err != nil {
		msg.Nack(false, true)
		return
	}

	//publish createdOtpDTO do otp.create.result.queue
	if err := h.publisher.Publish("otp", "create.result", responseSuccess); err != nil {
		msg.Nack(false, true)
		return
	}

	msg.Ack(false)
}

func (h *Handler) CreateOtpWithXDigits(msg rbmq.Delivery) {
	//try to parse the message to request object
	request := new(CreateOtpWithXDigitsRequest)
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

	//parse email
	parsedEmail, err := entity.NewEmail(request.ValidatedEmail)
	if err != nil {
		//no chance to return something usefull, goes to dlq
		msg.Nack(false, false)
		return
	}

	xDigits, ok := allowedAmountOfDigits(request.XDigits)
	if !ok {
		responseFail := CreateOtpResponseError{
			RequestID:    requestID,
			ErrorMessage: "quantidade de digitos inválida",
		}
		if err := h.publisher.Publish("otp", "create.result", responseFail); err != nil {
			msg.Nack(false, true)
			return
		}
		msg.Ack(false)
		return
	}

	//turn request into a command
	cmd := command.CreateWithXDigitsCommand{
		ClientID: requestID,
		Email:    parsedEmail,
		Hash:     request.Hash,
		XDigits:  xDigits,
	}

	createdOtpDTO, errorOnCreateOtpDTO := h.createOtpWithXDigits.Execute(&cmd)

	//publish the results
	if errorOnCreateOtpDTO != nil {
		//turn result into a response
		responseFail := CreateOtpResponseError{
			RequestID:    requestID,
			ErrorMessage: errorOnCreateOtpDTO.Message,
		}
		//publish errorOnCreateOtpDTO do otp.create.result.queue
		if err := h.publisher.Publish("otp", "create.result", responseFail); err != nil {
			msg.Nack(false, true)
			return
		}
		msg.Ack(false)
		return
	}

	//turn result into a response
	responseSuccess := CreateOtpResponseSuccess{
		RequestID:  createdOtpDTO.ClientID,
		OtpWord:    createdOtpDTO.OtpWord,
		Expiration: createdOtpDTO.Expiration,
	}

	if err := h.publishOtpNotification(requestID, parsedEmail, request.Hash, createdOtpDTO.OtpCode); err != nil {
		msg.Nack(false, true)
		return
	}

	//publish createdOtpDTO do otp.create.result.queue
	if err := h.publisher.Publish("otp", "create.result", responseSuccess); err != nil {
		msg.Nack(false, true)
		return
	}

	msg.Ack(false)
}

func (h *Handler) ValidateOtp(msg rbmq.Delivery) {
	//try to parse the message to request object
	request := new(ValidateOtpRequest)
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

	//parse email
	parsedEmail, err := entity.NewEmail(request.Email)
	if err != nil {
		//no chance to return something usefull, goes to dlq
		msg.Nack(false, false)
		return
	}

	//turn request into a command
	cmd := command.ValidateOtp{
		ClientID:        requestID,
		Email:           parsedEmail,
		OtpCode:         request.OtpCode,
		Expiration:      request.Expiration,
		OriginalOtpWord: request.OriginalOtpWord,
	}

	validatedOtpDTO := h.validateOtp.Execute(&cmd)

	//turn result into a response
	response := ValidateOtpResponse{
		RequestID:    validatedOtpDTO.ClientID,
		Valid:        validatedOtpDTO.Valid,
		ErrorMessage: validatedOtpDTO.ErrorMessage,
	}

	//publish validatedOtpDTO do otp.validate.result.queue
	if err := h.publisher.Publish("otp", "validate.result", response); err != nil {
		msg.Nack(false, true)
		return
	}

	msg.Ack(false)
}

func (h *Handler) publishOtpNotification(requestID uuid.UUID, email entity.Email, hash string, otpCode string) error {
	notification := emailamqp.SendNotificationRequest{
		RequestID: requestID.String(),
		Email:     email.String(),
		Hash:      hash,
		OtpCode:   otpCode,
	}

	return h.publisher.Publish("email", "send.email_notification", notification)
}

func allowedAmountOfDigits(xDigits int) (entity.AllowedAmountOfDigits, bool) {
	switch entity.AllowedAmountOfDigits(xDigits) {
	case entity.ThreeDigits, entity.FiveDigits, entity.SixDigits:
		return entity.AllowedAmountOfDigits(xDigits), true
	default:
		return 0, false
	}
}
