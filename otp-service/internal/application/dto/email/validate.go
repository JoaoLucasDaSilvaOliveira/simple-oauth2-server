package email

import (
	"oauth2/otp/internal/domain/entity"

	"github.com/google/uuid"
)

type ValidEmail struct {
	ClientID uuid.UUID
	Email    entity.Email
	Hash     string
}

type InvalidEmail struct {
	ClientID uuid.UUID
	Email    string
	Message  string
}
