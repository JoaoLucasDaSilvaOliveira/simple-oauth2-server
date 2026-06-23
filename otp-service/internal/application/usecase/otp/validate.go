package otp

import (
	command "oauth2/otp/internal/application/command/otp"
	"oauth2/otp/internal/domain/valueobject"
)

type ValidateUsecase struct {
	serverSecretKey string
}

func (uc *ValidateUsecase) Execute(cmd *command.ValidateOtp) (bool, error) {
	//validate otp
	return valueobject.ValidateOtp(uc.serverSecretKey, cmd.Email.String(), cmd.OtpCode, cmd.Expiration, cmd.OriginalOtpWord)	
}