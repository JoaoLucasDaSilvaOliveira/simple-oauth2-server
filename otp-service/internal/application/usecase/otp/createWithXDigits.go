package otp

import (
	command "oauth2/otp/internal/application/command/otp"
	dto "oauth2/otp/internal/application/dto/otp"
	"oauth2/otp/internal/application/usecase/otp/utils"
	"oauth2/otp/internal/domain/entity"
	"oauth2/otp/internal/domain/valueobject"
)

type CreateWithXDigitsUsecase struct {
	serverSecretKey string
}

func (uc *CreateWithXDigitsUsecase) Execute (cmd command.CreateWithXDigitsCommand) (*dto.CreateOtp, *dto.ErrorOtp) {
	//validate if hash was made by this app
	if !utils.Validate(cmd.Hash, cmd.Email.String(), uc.serverSecretKey) {
		return nil, &dto.ErrorOtp{Message: "email não validado por essa aplicação, por favor valide o email primeiro"}
	}

	//get default otp expiration time
	expiration := valueobject.GetDefaultOtpExpiration()

	//generate otp object
	otpObject, err := entity.GenerateOtpWithXDigits(cmd.Email, expiration, cmd.XDigits)
	
	if err != nil {
		return nil, &dto.ErrorOtp{Message: err.Error()}
	}

	//TODO: cria um event: entity.event.SendOtpByEmail(otpWord, email)

	return &dto.CreateOtp{
		OtpWord: otpObject.GetOtpWord(uc.serverSecretKey),
		Expiration: otpObject.GetExpiration(),
	}, nil
}