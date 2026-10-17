import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceLabel?: string;
}

export class RefreshDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  refreshToken?: string;
}

export class LogoutDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  refreshToken?: string;
}

// Desk PIN verification: exactly 4 digits; policy rules live in pin.util.ts.
export class PinVerifyDto {
  @IsString()
  @MaxLength(32)
  deskCode!: string;

  @IsString()
  @MaxLength(64)
  staffId!: string;

  @IsString()
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  idempotencyKey?: string;
}

export class PinResetDto {
  @IsString()
  @MaxLength(64)
  staffId!: string;

  @IsString()
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  newPin!: string;
}
