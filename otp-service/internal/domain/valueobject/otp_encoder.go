package valueobject

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
)

func EncodeUsingHMAC(otpPhrase string, salt string) string {
	h := hmac.New(sha256.New, []byte(salt))

	h.Write([]byte(otpPhrase))

	return hex.EncodeToString(h.Sum(nil))
}
