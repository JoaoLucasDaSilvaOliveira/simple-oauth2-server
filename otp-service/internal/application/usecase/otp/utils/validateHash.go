package utils

import (
	"crypto/subtle"
	"oauth2/otp/internal/domain/valueobject"
)

func Validate(receivedHash string, wordToHash string, serverSecretKey string) bool {
	hash := valueobject.EncodeUsingHMAC(serverSecretKey, wordToHash)

	if subtle.ConstantTimeCompare([]byte(hash), []byte(receivedHash)) != 1 {
		return false
	}

	return true
}
