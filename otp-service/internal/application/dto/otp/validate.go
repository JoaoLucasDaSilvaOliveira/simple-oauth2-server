package otp

import "github.com/google/uuid"

type ValidateOtp struct {
	ClientID     uuid.UUID
	Valid        bool
	ErrorMessage string
}
