import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Role } from '../db/schema';

export class CreateStaffDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  userId?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(160)
  fullName!: string;

  @ApiProperty({ enum: ['admin', 'doctor', 'handler', 'cashier', 'receptionist'] })
  @IsIn(['admin', 'doctor', 'handler', 'cashier', 'receptionist'])
  role!: Role;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  specialization?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  feeOverridePaisa?: number;
}

export class UpdateStaffDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  specialization?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  feeOverridePaisa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDoctorConfigDto {
  @ApiPropertyOptional({ description: 'Linked User UUID from users table' })
  @IsOptional()
  @IsString()
  userId?: string | null;

  @ApiPropertyOptional({ description: 'Doctor full name' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  fullName?: string;

  @ApiPropertyOptional({ description: 'Doctor display name alias' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  displayName?: string;

  @ApiPropertyOptional({ description: 'Contact phone / WhatsApp' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ description: 'Medical or physiotherapy specialization' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  specialization?: string;

  @ApiPropertyOptional({ description: 'Degrees and professional qualifications' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  qualifications?: string;

  @ApiPropertyOptional({ description: 'Standard consultation fee in Paisa (1 BDT = 100 Paisa)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  consultationFeePaisa?: number;

  @ApiPropertyOptional({ description: 'Standard consultation fee in Taka (BDT)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  consultationFeeTaka?: number;

  @ApiPropertyOptional({ description: 'Follow-up consultation fee in Paisa' })
  @IsOptional()
  @IsInt()
  @Min(0)
  followUpFeePaisa?: number;

  @ApiPropertyOptional({ description: 'Follow-up consultation fee in Taka (BDT)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  followUpFeeTaka?: number;

  @ApiPropertyOptional({ description: 'Report review fee in Paisa' })
  @IsOptional()
  @IsInt()
  @Min(0)
  reportFeePaisa?: number;

  @ApiPropertyOptional({ description: 'Report review fee in Taka (BDT)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  reportFeeTaka?: number;

  @ApiPropertyOptional({ description: 'Assigned consultation room / chamber UUID from rooms table' })
  @IsOptional()
  @IsString()
  chamberRoomId?: string;

  @ApiPropertyOptional({ description: 'Maximum daily consultation quota', default: 40 })
  @IsOptional()
  @IsInt()
  @Min(1)
  dailyQuota?: number;

  @ApiPropertyOptional({ description: 'Average slot duration in minutes', default: 15 })
  @IsOptional()
  @IsInt()
  @Min(5)
  slotDurationMinutes?: number;

  @ApiPropertyOptional({ description: 'Duty start time e.g. 09:00 AM' })
  @IsOptional()
  @IsString()
  dutyStartTime?: string;

  @ApiPropertyOptional({ description: 'Duty end time e.g. 05:00 PM' })
  @IsOptional()
  @IsString()
  dutyEndTime?: string;

  @ApiPropertyOptional({ description: 'Array of days doctor is available in clinic', type: [String] })
  @IsOptional()
  @IsArray()
  availableDays?: string[];

  @ApiPropertyOptional({ description: 'Custom configured time slot presets (JSON array of strings e.g. ["09:00 AM", "09:15 AM"])', type: [String] })
  @IsOptional()
  @IsArray()
  customTimeSlots?: string[];

  @ApiPropertyOptional({ description: 'Active status of the doctor profile' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Operational notes / remarks' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateDoctorDto {
  @ApiPropertyOptional({ description: 'Link to existing User account UUID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ description: 'Doctor full name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  fullName!: string;

  @ApiPropertyOptional({ description: 'Doctor display name alias' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  displayName?: string;

  @ApiPropertyOptional({ description: 'Doctor user login email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Doctor user initial login password' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: 'Contact phone / WhatsApp' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ description: 'Medical or physiotherapy specialization' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  specialization?: string;

  @ApiPropertyOptional({ description: 'Degrees and professional qualifications' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  qualifications?: string;

  @ApiPropertyOptional({ description: 'Standard consultation fee in Paisa' })
  @IsOptional()
  @IsInt()
  @Min(0)
  consultationFeePaisa?: number;

  @ApiPropertyOptional({ description: 'Standard consultation fee in Taka (BDT)', default: 500 })
  @IsOptional()
  @IsInt()
  @Min(0)
  consultationFeeTaka?: number;

  @ApiPropertyOptional({ description: 'Follow-up consultation fee in Paisa' })
  @IsOptional()
  @IsInt()
  @Min(0)
  followUpFeePaisa?: number;

  @ApiPropertyOptional({ description: 'Follow-up consultation fee in Taka (BDT)', default: 300 })
  @IsOptional()
  @IsInt()
  @Min(0)
  followUpFeeTaka?: number;

  @ApiPropertyOptional({ description: 'Report review fee in Paisa' })
  @IsOptional()
  @IsInt()
  @Min(0)
  reportFeePaisa?: number;

  @ApiPropertyOptional({ description: 'Report review fee in Taka (BDT)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  reportFeeTaka?: number;

  @ApiPropertyOptional({ description: 'Assigned consultation room / chamber UUID from rooms table' })
  @IsOptional()
  @IsString()
  chamberRoomId?: string;

  @ApiPropertyOptional({ description: 'Maximum daily consultation quota', default: 40 })
  @IsOptional()
  @IsInt()
  @Min(1)
  dailyQuota?: number;

  @ApiPropertyOptional({ description: 'Average slot duration in minutes', default: 15 })
  @IsOptional()
  @IsInt()
  @Min(5)
  slotDurationMinutes?: number;

  @ApiPropertyOptional({ description: 'Duty start time e.g. 09:00 AM' })
  @IsOptional()
  @IsString()
  dutyStartTime?: string;

  @ApiPropertyOptional({ description: 'Duty end time e.g. 05:00 PM' })
  @IsOptional()
  @IsString()
  dutyEndTime?: string;

  @ApiPropertyOptional({ description: 'Array of days doctor is available in clinic', type: [String] })
  @IsOptional()
  @IsArray()
  availableDays?: string[];

  @ApiPropertyOptional({ description: 'Custom configured time slot presets (JSON array of strings e.g. ["09:00 AM", "09:15 AM"])', type: [String] })
  @IsOptional()
  @IsArray()
  customTimeSlots?: string[];

  @ApiPropertyOptional({ description: 'Operational notes / remarks' })
  @IsOptional()
  @IsString()
  notes?: string;
}
