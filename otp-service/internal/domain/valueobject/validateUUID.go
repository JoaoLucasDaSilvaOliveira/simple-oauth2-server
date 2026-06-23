package valueobject

import (
	"fmt"
	"strings"

	"github.com/google/uuid"
)

func ValidateUUID(rawUUID string) (uuid.UUID, error) {
	rawUUID = strings.TrimSpace(rawUUID)

	if rawUUID == "" {
		return uuid.Nil, fmt.Errorf("request_id fornecido está vazio")
	}

	parsedUUID, err := uuid.Parse(rawUUID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("request_id inválido")
	}

	return parsedUUID, nil
}
