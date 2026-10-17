import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
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

  @ApiPropertyOptional({ description: 'Date of birth YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Age in years if DOB unknown' })
  @IsOptional()
  @IsInt()
  @Min(0)
  ageYears?: number;

  @ApiProperty({ enum: ['male', 'female', 'other'] })
  @IsIn(['male', 'female', 'other'])
  gender!: 'male' | 'female' | 'other';

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
  @IsString()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  ageYears?: number;

  @ApiPropertyOptional({ enum: ['male', 'female', 'other'] })
  @IsOptional()
  @IsIn(['male', 'female', 'other'])
  gender?: 'male' | 'female' | 'other';

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
