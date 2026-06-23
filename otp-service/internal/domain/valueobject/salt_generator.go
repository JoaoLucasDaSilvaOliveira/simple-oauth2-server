package valueobject

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"path/filepath"
)

const SALT_DEF_FILE = ".salt"

func ReadSalt() (string, error) {
	return ReadSaltFromFile(SaltFilePath())
}

func SaltFilePath() string {
	return defaultSaltFilePath()
}

func ReadSaltFromFile(saltFilePath string) (string, error) {
	//try to read salt file
	saltBytes, err := os.ReadFile(saltFilePath)

	//check existence of error
	if err != nil {
		//check if error is because .salt wasn't generated yet
		if errors.Is(err, os.ErrNotExist) {
			//generate salt and .salt file
			if err := GenerateSalt(saltFilePath); err != nil {
				return "", err
			}
			//recursive call and return
			return ReadSaltFromFile(saltFilePath)
		} else {
			return "", fmt.Errorf("erro ao abrir arquivo salt: %w", err)
		}
	}

	//parse the salt saved on file to string
	saltHex := string(saltBytes)

	//return salt
	return saltHex, nil
}

func GenerateSalt(saltFilePath string) error {
	bytes := make([]byte, 32)

	if _, err := rand.Read(bytes); err != nil {
		return errors.New("erro ao gerar o salt")
	}

	saltHex := hex.EncodeToString(bytes)

	if err := os.MkdirAll(filepath.Dir(saltFilePath), 0755); err != nil {
		return fmt.Errorf("erro ao criar diretório do salt: %w", err)
	}

	if err := os.WriteFile(saltFilePath, []byte(saltHex), 0600); err != nil {
		return fmt.Errorf("erro ao salvar arquivo salt: %w", err)
	}

	return nil
}

func defaultSaltFilePath() string {
	if saltFilePath := os.Getenv("SALT_FILE_PATH"); saltFilePath != "" {
		return saltFilePath
	}

	if configDir := os.Getenv("APP_CONFIG_DIR"); configDir != "" {
		return filepath.Join(configDir, SALT_DEF_FILE)
	}

	userConfigDir, err := os.UserConfigDir()
	if err == nil {
		return filepath.Join(userConfigDir, "otp-service", SALT_DEF_FILE)
	}

	return SALT_DEF_FILE
}
