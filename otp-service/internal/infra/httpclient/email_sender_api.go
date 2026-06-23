package httpclient

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"oauth2/otp/internal/domain/entity"
	"oauth2/otp/internal/infra/config"
	"time"
)

type EmailSenderObject struct {
	cfg *config.EmailSenderApi
}

func NewEmailSenderObject(cfg *config.EmailSenderApi) *EmailSenderObject {
	return &EmailSenderObject{
		cfg: cfg,
	}
}

type data struct {
	Email   entity.Email `json:"email"`
	OtpCode string       `json:"code"`
}

func (emso *EmailSenderObject)SendOtpByEmail(emailTosend entity.Email, otpCode string) error {
	data := data{
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

	req, err := http.NewRequest("POST", emso.cfg.ApiUrl, bytes.NewBuffer(jsonPayload))

	if err != nil {
		return fmt.Errorf("falha ao criar requisição para api: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("API_KEY", emso.cfg.ApiKey)

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
