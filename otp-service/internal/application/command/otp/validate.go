package otp

import (
	"oauth2/otp/internal/domain/entity"
	"github.com/google/uuid"
)

type ValidateOtp struct {
	ClientID        uuid.UUID
	Email           entity.Email
	OtpCode         string
	Expiration      int64
	OriginalOtpWord string
}
