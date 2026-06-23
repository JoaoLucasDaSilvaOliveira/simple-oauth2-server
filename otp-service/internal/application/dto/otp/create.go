package otp

import "github.com/google/uuid"

type CreatedOtp struct {
	ClientID   uuid.UUID
	OtpCode    string
	OtpWord    string
	Expiration int64
}

type ErrorOnCreateOtp struct {
	ClientID uuid.UUID
	Message  string
}
