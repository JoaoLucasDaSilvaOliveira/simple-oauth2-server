package otp

import (
	"oauth2/otp/internal/domain/entity"

	"github.com/google/uuid"
)

type CreateWithXDigitsCommand struct {
	ClientID uuid.UUID
	Email    entity.Email
	Hash     string
	XDigits  entity.AllowedAmountOfDigits
}
