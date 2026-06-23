package otp

import (
	command "oauth2/otp/internal/application/command/otp"
	dto "oauth2/otp/internal/application/dto/otp"
	"oauth2/otp/internal/application/usecase/otp/utils"
	"oauth2/otp/internal/domain/entity"
	"oauth2/otp/internal/domain/valueobject"
)

type CreateUsecase struct {
	serverSecretKey string
}

func NewCreateUsecase(serverSecretKey string) *CreateUsecase {
	return &CreateUsecase{
		serverSecretKey: serverSecretKey,
	}
}

func (uc *CreateUsecase) Execute(cmd *command.CreateCommand) (*dto.CreatedOtp, *dto.ErrorOnCreateOtp) {
	//validate if hash was made by this app
	if !utils.Validate(cmd.Hash, cmd.Email.String(), uc.serverSecretKey) {
		return nil, &dto.ErrorOnCreateOtp{
			ClientID: cmd.ClientID,
			Message:  "email não validado por essa aplicação, por favor valide o email primeiro",
		}
	}

	//get default otp expiration time
	expiration := valueobject.GetDefaultOtpExpiration()

	//generate otp object
	otpObject, err := entity.GenerateOtp(cmd.Email, expiration)

	if err != nil {
		return nil, &dto.ErrorOnCreateOtp{
			ClientID: cmd.ClientID,
			Message:  err.Error(),
		}
	}

	//TODO: cria um event: entity.event.SendOtpByEmail(otpWord, email)

	return &dto.CreatedOtp{
		ClientID:   cmd.ClientID,
		OtpWord:    otpObject.GetOtpWord(uc.serverSecretKey),
		Expiration: otpObject.GetExpiration(),
		OtpCode:    otpObject.GetOtpDigits(),
	}, nil
}
