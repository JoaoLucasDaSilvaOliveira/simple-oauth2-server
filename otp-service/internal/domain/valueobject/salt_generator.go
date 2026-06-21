package valueobject

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
)

const SALT_DEF_FILE = ".salt"

func ReadSalt () (string, error) {
	//try to read salt file
	saltBytes, err := os.ReadFile(SALT_DEF_FILE)

	//check existence of error
	if err != nil {
		//check if error is because .salt wasn't generated yet
		if errors.Is(err, os.ErrNotExist) {
			//generate salt and .salt file
			if err := GenerateSalt(); err != nil {
				return "", err
			}
			//recursive call and return
			return ReadSalt()
		} else {
			return "", fmt.Errorf("erro ao abrir arquivo salt: %w", err)
		}
	}

	//parse the salt saved on file to string
	saltHex := string(saltBytes)

	//return salt
	return saltHex, nil
}

func GenerateSalt() error {
	bytes := make([]byte, 32)

	if _, err := rand.Read(bytes); err != nil {
		return errors.New("erro ao gerar o salt")
	}

	saltHex := hex.EncodeToString(bytes)

	os.WriteFile(SALT_DEF_FILE, []byte(saltHex), 0666)

	return nil
}