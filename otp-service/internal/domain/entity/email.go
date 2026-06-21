package entity

import (
	"fmt"
	"net/mail"
	"strings"
)

type Email string

func NewEmail(rawEmail string) (Email, error) {
	rawEmail = strings.TrimSpace(rawEmail)

	if rawEmail == "" {
		return "", fmt.Errorf("email fornecido está vazio")
	}

	_, err := mail.ParseAddress(rawEmail)

	if err != nil {
		return "", fmt.Errorf("email invalido")
	}

	return Email(strings.ToLower(rawEmail)), nil
}

func (e Email) String() string {
	return string(e)
}