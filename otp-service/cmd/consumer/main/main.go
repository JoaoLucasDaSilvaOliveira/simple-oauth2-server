package main

import (
	"fmt"
	"log"
	"oauth2/otp/internal/domain/entity"
	"oauth2/otp/internal/domain/valueobject"
)

func main() {
	//try to open .salt
	salt, err := valueobject.ReadSalt()

	//check for error on reading .salt
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("SALT: " + salt)

	//get a expiration time for otp
	expiration := valueobject.GetDefaultOtpExpiration()

	//create a otp phrase
	otpObject, err := entity.GenerateOtp("jlso9866@gmail.com", expiration)

	//check for error occurrence
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("OTP_PHRASE: " + otpObject.GetOtpWord(salt))

	fmt.Println("OTP_CODE: " + otpObject.GetOtpDigits())

	fmt.Println("OTP_EXPIRATION_TIME: " + fmt.Sprintf("%d", otpObject.GetExpiration()))

	//try to validate an otp
	if _, err := valueobject.Validate(salt, "jlso9866@gmail.com", otpObject.GetOtpDigits(), otpObject.GetExpiration(), otpObject.GetOtpWord(salt)); err != nil {
		log.Fatal(err)
	}

	fmt.Println("Otp valido!")
}
