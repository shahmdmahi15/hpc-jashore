import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePatientDto {
  @ApiProperty({ description: 'Full name in English' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  nameEn!: string;

  @ApiPropertyOptional({ description: 'Full name in Bengali' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameBn?: string;

  @ApiProperty({ description: 'Bangladeshi 11-digit mobile number: 01XXXXXXXXX' })
  @IsString()
  @Matches(/^01[3-9]\d{8}$/, { message: 'Phone must be a valid Bangladeshi mobile number (01XXXXXXXXX)' })
  phone!: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(128)
  email?: string;

  @ApiPropertyOptional({ description: 'Date of birth YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Age in years if DOB unknown' })
  @IsOptional()
  @IsInt()
  @Min(0)
  ageYears?: number;

  @ApiProperty({ enum: ['male', 'female'], description: 'Gender: strictly male or female' })
  @IsIn(['male', 'female'], { message: 'Gender must be strictly male or female' })
  gender!: 'male' | 'female';

  @ApiPropertyOptional({ description: 'Blood group: A+, A-, B+, B-, AB+, AB-, O+, O-' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  bloodGroup?: string;

  @ApiPropertyOptional({ description: 'Full residential address' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  address?: string;

  @ApiPropertyOptional({ description: 'Occupation / Profession' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  occupation?: string;

  @ApiPropertyOptional({ description: 'Profession alias for occupation' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  profession?: string;

  @ApiPropertyOptional({ description: 'Emergency contact name and phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  emergencyContact?: string;

  @ApiPropertyOptional({ description: 'Allergies list' })
  @IsOptional()
  @IsString()
  allergies?: string;

  @ApiPropertyOptional({ description: 'Chronic medical conditions' })
  @IsOptional()
  @IsString()
  chronicConditions?: string;

  @ApiPropertyOptional({ description: 'Contraindications or precautions' })
  @IsOptional()
  @IsString()
  contraindications?: string;

  @ApiPropertyOptional({ description: 'Consent signed flag (0 or 1)' })
  @IsOptional()
  @IsInt()
  consentSigned?: number;
}

export class UpdatePatientDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  nameBn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^01[3-9]\d{8}$/, { message: 'Phone must be a valid Bangladeshi mobile number (01XXXXXXXXX)' })
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(128)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  ageYears?: number;

  @ApiPropertyOptional({ enum: ['male', 'female'] })
  @IsOptional()
  @IsIn(['male', 'female'], { message: 'Gender must be strictly male or female' })
  gender?: 'male' | 'female';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  bloodGroup?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(256)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  occupation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  profession?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  emergencyContact?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  allergies?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  chronicConditions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contraindications?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  consentSigned?: number;
}
