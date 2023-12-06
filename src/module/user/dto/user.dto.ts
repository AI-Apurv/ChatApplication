import {
  IsEmail,
  IsNotEmpty,
  IsNumberString,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class LoginRequestDto {
  @IsEmail()
  @IsNotEmpty()
  public readonly email: string;

  @IsString()
  @IsNotEmpty()
  public readonly password: string;
}

export class RegisterRequestDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsString()
  @Length(5, 20)
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message:
      'Username must be at least 5 characters long and contain only letters, numbers, and underscores',
  })
  userName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 20)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
    {
      message:
        'Password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character',
    },
  )
  password: string;

  @IsNotEmpty()
  @Length(10, 10, {
    message: 'Invalid contact number format. It should be 10 digit long ',
  })
  @IsNumberString(
    { no_symbols: true },
    { message: 'Contact number can only contain numbers' },
  )
  contactNumber: string;
}

export class SendMessageDto {
  
  @IsString()
  public readonly message: string;
}
