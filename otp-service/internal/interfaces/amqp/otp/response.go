package otp

import "github.com/google/uuid"

type CreateOtpResponseSuccess struct { //same to CreateOtpWithXDigitsResponseSuccess
	RequestID  uuid.UUID `json:"request_id"`
	OtpWord    string    `json:"otp_hash"`
	Expiration int64     `json:"expiration"`
}

type CreateOtpResponseError struct { // same to CreateOtpWithXDigitsResponseError
	RequestID    uuid.UUID `json:"request_id"`
	ErrorMessage string    `json:"error_message"`
}

type ValidateOtpResponse struct {
	RequestID    uuid.UUID `json:"request_id"`
	Valid        bool      `json:"valid"`
	ErrorMessage string    `json:"error_message,omitempty"`
}
