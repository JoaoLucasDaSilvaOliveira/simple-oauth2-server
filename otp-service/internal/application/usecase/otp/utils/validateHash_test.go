package utils

import (
	"testing"

	"oauth2/otp/internal/domain/valueobject"
)

func TestValidateReturnsTrueWhenHashMatches(t *testing.T) {
	t.Parallel()

	wordToHash := "kaua@email.com"
	serverSecretKey := "secret-key"
	receivedHash := valueobject.EncodeUsingHMAC(wordToHash, serverSecretKey)

	if !Validate(receivedHash, wordToHash, serverSecretKey) {
		t.Fatalf("expected Validate to return true for a matching hash")
	}
}

func TestValidateReturnsFalseWhenHashDiffers(t *testing.T) {
	t.Parallel()

	if Validate("invalid-hash", "kaua@email.com", "secret-key") {
		t.Fatalf("expected Validate to return false for a mismatched hash")
	}
}
