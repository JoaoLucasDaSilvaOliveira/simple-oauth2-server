package valueobject

import "time"

const DEFAULT_OTP_EXPIRATION_MINUTES = 5 * time.Minute

func SetOtpExpiration (expiration time.Time) int64 {
	return expiration.Unix()
}

func GetDefaultOtpExpiration () int64 {
	return SetOtpExpiration(time.Now().Add(DEFAULT_OTP_EXPIRATION_MINUTES))
}