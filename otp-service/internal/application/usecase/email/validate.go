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

func (uc *ValidateUsecase) Execute(cmd command.ValidateCommand) (*dto.ValidEmail, *dto.InvalidEmail) {
	//validate email
	validatedEmail, err := entity.NewEmail(cmd.RawEmail)

	if err != nil {
		return nil, &dto.InvalidEmail{
			ClientID: cmd.ClientID,
			Email: entity.Email(cmd.RawEmail),
			Message: err.Error(),
		}
	}

	//generate hash to garantee for other usecases that the email was validaded by this application
	hash := valueobject.EncodeUsingHMAC(validatedEmail.String(), uc.serverSecretKey)

	return &dto.ValidEmail{
		ClientID: cmd.ClientID,
		Email:    validatedEmail,
		Hash:     hash,
	}, nil
}
