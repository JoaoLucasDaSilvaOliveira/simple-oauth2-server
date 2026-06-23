package email

import "github.com/google/uuid"

type ValidateEmailRequest struct {
	RequestID uuid.UUID `json:"request_id"`
	RawEmail  string `json:"email"`
}
