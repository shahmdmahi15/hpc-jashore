import { IsBoolean, IsEmail, IsIn, IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { Role } from '../db/schema';

export class CreateUserDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsIn(['admin', 'doctor', 'handler', 'cashier', 'receptionist'])
  role!: Role;

  @IsString()
  @MaxLength(160)
  displayName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  consultationFeePaisa?: number;

  @IsOptional()
  @IsNumber()
  consultationFeeTaka?: number;

  @IsOptional()
  @IsNumber()
  followUpFeePaisa?: number;

  @IsOptional()
  @IsNumber()
  followUpFeeTaka?: number;

  @IsOptional()
  @IsNumber()
  reportFeePaisa?: number;

  @IsOptional()
  @IsNumber()
  reportFeeTaka?: number;

  @IsOptional()
  @IsString()
  chamberRoomId?: string | null;

  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;

  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected'])
  approvalStatus?: 'pending' | 'approved' | 'rejected';
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  displayName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsIn(['admin', 'doctor', 'handler', 'cashier', 'receptionist'])
  role?: Role;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  @IsOptional()
  @IsNumber()
  consultationFeePaisa?: number;

  @IsOptional()
  @IsNumber()
  consultationFeeTaka?: number;

  @IsOptional()
  @IsNumber()
  followUpFeePaisa?: number;

  @IsOptional()
  @IsNumber()
  followUpFeeTaka?: number;

  @IsOptional()
  @IsNumber()
  reportFeePaisa?: number;

  @IsOptional()
  @IsNumber()
  reportFeeTaka?: number;

  @IsOptional()
  @IsString()
  chamberRoomId?: string | null;

  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;

  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected'])
  approvalStatus?: 'pending' | 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class RejectUserDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
