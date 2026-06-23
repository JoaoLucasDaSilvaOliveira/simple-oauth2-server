package email

import "github.com/google/uuid"

type ValidateEmailResponseSucess struct {
	RequestID uuid.UUID `json:"request_id"`
	Email     string    `json:"email"`
	Hash      string    `json:"hash"`
}

type ValidateEmailResponseFail struct {
	RequestID    uuid.UUID `json:"request_id"`
	Email        string    `json:"email"`
	ErrorMessage string    `json:"error_message"`
}
