package email

import "oauth2/otp/internal/domain/entity"

type SendNotification struct {
	EmailToSend entity.Email
	Hash        string
	OtpCode     string
}
