package otp

import (
	command "oauth2/otp/internal/application/command/otp"
	dto "oauth2/otp/internal/application/dto/otp"
	"oauth2/otp/internal/domain/valueobject"
)

type ValidateUsecase struct {
	serverSecretKey string
}

func (uc *ValidateUsecase) Execute(cmd *command.ValidateOtp) *dto.ValidateOtp {
	//validate otp
	validOtp, err := valueobject.ValidateOtp(uc.serverSecretKey, cmd.Email.String(), cmd.OtpCode, cmd.Expiration, cmd.OriginalOtpWord)	

	if err != nil {
		return &dto.ValidateOtp{
			ClientID: cmd.ClientID,
			Valid: validOtp,
			ErrorMessage: err.Error(),
		}
	}
	
	return &dto.ValidateOtp{
		ClientID: cmd.ClientID,
		Valid: validOtp,
		ErrorMessage: "",
	}
}