package email

type ValidateEmailRequest struct {
	RequestID string `json:"request_id"`
	RawEmail  string `json:"email"`
}

type SendNotificationRequest struct {
	RequestID string `json:"request_id"`
	Email     string `json:"email"`
	Hash      string `json:"hash"`
	OtpCode   string `json:"otp_code"`
}
