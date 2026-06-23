package valueobject

import (
	"crypto/subtle"
	"errors"
	"fmt"
	"time"
)

func ValidateOtp(salt string, email string, otpInput string, expiration int64, hashOriginal string) (bool, error) {
	//verify if isn't expired yet
	if time.Now().Unix() > expiration {
		return false, errors.New("token otp expirado")
	}

	// trasnform informations on a otpPhrase
	otpPhrase := email + otpInput + fmt.Sprintf("%d", expiration)

	//transform otpPhrase into a otpWord and get hash
	otpHash := EncodeUsingHMAC(otpPhrase, salt)

	if subtle.ConstantTimeCompare([]byte(otpHash), []byte(hashOriginal)) != 1 {
		return false, errors.New("código OTP inválido ou assinatura corrompida")
	}

	return true, nil
}
