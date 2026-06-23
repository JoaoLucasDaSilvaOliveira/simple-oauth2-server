package email

import "github.com/google/uuid"

type ValidateEmailRequest struct {
	RequestID uuid.UUID `json:"request_id"`
	RawEmail  string    `json:"email"`
}

type SendNotificationRequest struct {
	RequestID uuid.UUID `json:"request_id"`
	Email     string    `json:"email"`
	Hash      string    `json:"hash"`
	OtpCode   string    `json:"otp_code"`
}
