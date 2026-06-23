package email

import (
	command "oauth2/otp/internal/application/command/email"
	"oauth2/otp/internal/application/usecase/otp/utils"
	"oauth2/otp/internal/infra/httpclient"
)

type SendNotificationUsecase struct {
	serverSecretKey string
	sender          *httpclient.EmailSenderObject
}

func NewSendNotificationUsecase(serverSecretKey string, sender *httpclient.EmailSenderObject) *SendNotificationUsecase {
	return &SendNotificationUsecase{
		serverSecretKey: serverSecretKey,
		sender:          sender,
	}
}

func (uc *SendNotificationUsecase) Execute(cmd command.SendNotification) bool {
	//validate if hash was made by this app
	if !utils.Validate(cmd.Hash, cmd.EmailToSend.String(), uc.serverSecretKey) {
		return false
	}

	if err := uc.sender.SendOtpByEmail(cmd.EmailToSend, cmd.OtpCode); err != nil {
		return false
	}

	return true
}
