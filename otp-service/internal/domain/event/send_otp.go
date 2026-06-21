package event

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"oauth2/otp/internal/domain/entity"
	"time"
)

var (
	API_URL string
	API_KEY string
)

func Initialize(apiUrl string, apiKey string) {
	API_KEY = apiKey
	API_URL = apiUrl
}

type SendData struct {
	Email   entity.Email `json:"email"`
	OtpCode string       `json:"code"`
}

func SendOtpByEmail(emailTosend entity.Email, otpCode string) error {
	if API_KEY == "" || API_URL == "" {
		return fmt.Errorf("api_key ou api_url não inicializadas, é preico inicializar os valores")
	}

	data := SendData{
		Email:   emailTosend,
		OtpCode: otpCode,
	}
	jsonPayload, err := json.Marshal(data)

	if err != nil {
		return fmt.Errorf("falha ao serializar o payload do OTP: %w", err)
	}

	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	req, err := http.NewRequest("POST", API_URL, bytes.NewBuffer(jsonPayload))

	if err != nil {
		return fmt.Errorf("falha ao criar requisição para api: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("API_KEY", API_KEY)

	resp, err := client.Do(req)

	if err != nil {
		return fmt.Errorf("erro na conexão com o servidor da api: %w", err)
	}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		errorMap := make(map[string]any)
		if err := json.NewDecoder(req.Body).Decode(&errorMap); err != nil {
			return fmt.Errorf("erro ao decodificar o corpo da requisição da api")
		}
		return fmt.Errorf("erro na api:\nstatus_code: %d\tmessage: %s", resp.StatusCode, errorMap["error"])
	}

	return nil
}
