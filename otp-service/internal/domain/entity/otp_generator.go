package entity

import (
	"crypto/rand"
	"fmt"
	"math"
	"math/big"
	"oauth2/otp/internal/domain/valueobject"
)

type AllowedAmountOfDigits int

const (
	ThreeDigits AllowedAmountOfDigits = 3
	FiveDigits  AllowedAmountOfDigits = 5 //default
	SixDigits   AllowedAmountOfDigits = 6
)

type OtpObject struct {
	expirationTime int64
	otpWord        *OtpWord
	otpDigits      string
}

func NewOtpObject(expirationTime int64, otpWord *OtpWord, digits string) *OtpObject {
	return &OtpObject{
		expirationTime: expirationTime,
		otpWord:        otpWord,
		otpDigits:      digits,
	}
}

func (oo *OtpObject) GetExpiration() int64 {
	return oo.expirationTime
}

func (oo *OtpObject) GetOtpWord(salt string) string {
	return valueobject.EncodeUsingHMAC(string(*oo.otpWord), salt)
}

func (oo *OtpObject) GetOtpDigits() string {
	return oo.otpDigits
}

type OtpWord string

func NewOtpWord(word string) *OtpWord {
	ow := OtpWord(word)
	return &ow
}

func GenerateOtp(email Email, expiration int64) (*OtpObject, error) {
	return GenerateOtpWithXDigits(email, expiration, FiveDigits)
}

func GenerateOtpWithXDigits(email Email, expiration int64, xDigits AllowedAmountOfDigits) (*OtpObject, error) {
	limit := int64(math.Pow(10, float64(xDigits)))
	limitDigits := big.NewInt(limit)
	otpNumbers, err := rand.Int(rand.Reader, limitDigits)

	if err != nil {
		return nil, err
	}

	otpNumbersString := fmt.Sprintf("%0*d", xDigits, otpNumbers.Int64())

	otpPhrase := email.String() + otpNumbersString + fmt.Sprintf("%d", expiration)

	return NewOtpObject(expiration, NewOtpWord(otpPhrase), otpNumbersString), nil
}
