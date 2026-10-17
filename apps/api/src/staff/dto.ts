import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import type { Role } from '../db/schema';

export class CreateStaffDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  userId?: string;

  @IsString()
  @MaxLength(160)
  fullName!: string;

  @IsIn(['doctor', 'head_doctor', 'reception', 'therapist', 'cashier'])
  role!: Role;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  specialization?: string;

  @IsOptional()
  @IsInt()
  feeOverridePaisa?: number;
}

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  specialization?: string;

  @IsOptional()
  @IsInt()
  feeOverridePaisa?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
