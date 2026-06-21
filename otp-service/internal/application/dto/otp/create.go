package otp

type CreateOtp struct {
	OtpWord    string
	Expiration int64
}

type ErrorOtp struct {
	Message string
}
