import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { Role } from '../db/schema';

export class CreateUserDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsIn(['admin', 'head_doctor', 'doctor', 'reception', 'therapist', 'cashier'])
  role!: Role;

  @IsString()
  @MaxLength(160)
  displayName!: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  displayName?: string;

  @IsOptional()
  @IsIn(['admin', 'head_doctor', 'doctor', 'reception', 'therapist', 'cashier'])
  role?: Role;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;
}
