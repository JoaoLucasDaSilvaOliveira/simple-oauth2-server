package email

import (
	"oauth2/otp/internal/domain/entity"

	"github.com/google/uuid"
)

type ValidatedEmail struct {
	ClientID uuid.UUID
	Email entity.Email
	Hash string
}

type InvalidatedEmail struct {
	Message string
}
