package email

import (
	command "oauth2/otp/internal/application/command/email"
	dto "oauth2/otp/internal/application/dto/email"
	"oauth2/otp/internal/domain/entity"
	"oauth2/otp/internal/domain/valueobject"
)

type ValidateUsecase struct {
	serverSecretKey string
}

func (uc *ValidateUsecase) Execute(cmd command.ValidateCommand) (*dto.ValidatedEmail, *dto.InvalidatedEmail) {
	//validate email
	validatedEmail, err := entity.NewEmail(cmd.RawEmail)

	if err != nil {
		return nil, &dto.InvalidatedEmail{Message: err.Error()}
	}

	//generate hash to garantee for other usecases that the email was validaded by this application
	hash := valueobject.EncodeUsingHMAC(validatedEmail.String(), uc.serverSecretKey)

	return &dto.ValidatedEmail{
		ClientID: cmd.ClientID,
		Email:    validatedEmail,
		Hash:     hash,
	}, nil
}
