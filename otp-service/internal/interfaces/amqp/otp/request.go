package otp

import "github.com/google/uuid"

type CreateOtpRequest struct {
	RequestID      uuid.UUID `json:"request_id"`
	ValidatedEmail string    `json:"email"`
	Hash           string    `json:"hash"`
}

type CreateOtpWithXDigitsRequest struct {
	RequestID      uuid.UUID `json:"request_id"`
	ValidatedEmail string    `json:"email"`
	Hash           string    `json:"hash"`
	XDigits        int       `json:"quantity_digits"`
}

type ValidateOtpRequest struct {
	RequestID       uuid.UUID `json:"request_id"`
	Email           string    `json:"email"`
	OtpCode         string `json:"otp_code"`
	Expiration      int64 `json:"expiration"`
	OriginalOtpWord string `json:"original_hash"`
}
