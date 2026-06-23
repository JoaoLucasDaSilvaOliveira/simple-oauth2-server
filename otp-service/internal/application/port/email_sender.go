package port

import (
	"oauth2/otp/internal/domain/entity"
	"oauth2/otp/internal/infra/config"
)

type EmailSender interface {
	SendOtp(cfg *config.EmailSenderApi, email entity.Email, otpCode string) error
}