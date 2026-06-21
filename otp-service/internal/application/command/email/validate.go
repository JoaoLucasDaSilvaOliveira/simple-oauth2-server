package email

import "github.com/google/uuid"

type ValidateCommand struct {
	ClientID uuid.UUID
	RawEmail string
}
