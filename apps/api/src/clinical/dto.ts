import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class VitalsDto {
  @ApiPropertyOptional({ example: '120/80' })
  @IsOptional()
  @IsString()
  bp?: string;

  @ApiPropertyOptional({ example: '72' })
  @IsOptional()
  @IsString()
  pulse?: string;

  @ApiPropertyOptional({ example: '98.6' })
  @IsOptional()
  @IsString()
  temp?: string;

  @ApiPropertyOptional({ example: '98' })
  @IsOptional()
  @IsString()
  spo2?: string;

  @ApiPropertyOptional({ example: '68' })
  @IsOptional()
  @IsString()
  weightKg?: string;
}

export class SoapNotesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subjective?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  objective?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assessment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  plan?: string;
}

export class CreateTherapyPlanItemDto {
  @ApiProperty({ example: 'IFT' })
  @IsString()
  @IsNotEmpty()
  modalityCode!: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  totalSessions!: number;

  @ApiPropertyOptional({ example: 'daily' })
  @IsOptional()
  @IsString()
  frequency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePrescriptionItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  medicineId?: string;

  @ApiProperty({ example: 'Tab. Ace Plus 500mg' })
  @IsString()
  @IsNotEmpty()
  medicineName!: string;

  @ApiProperty({ example: '1+0+1' })
  @IsString()
  @IsNotEmpty()
  dosage!: string;

  @ApiProperty({ example: 7 })
  @IsInt()
  @Min(1)
  durationDays!: number;

  @ApiPropertyOptional({ example: 'ভরা পেটে' })
  @IsOptional()
  @IsString()
  instructionsBn?: string;

  @ApiPropertyOptional({ example: 'After meal' })
  @IsOptional()
  @IsString()
  instructionsEn?: string;
}

export class CreateConsultationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  visitId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Assigned doctor staff UUID' })
  @IsOptional()
  @IsString()
  doctorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  chiefComplaints?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  history?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => VitalsDto)
  vitals?: VitalsDto;

  @ApiPropertyOptional({ description: 'VAS Pain Score 0 (no pain) to 10 (worst)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  painScoreVas?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => SoapNotesDto)
  soapNotes?: SoapNotesDto;

  @ApiPropertyOptional({ description: 'List of diagnosed condition names/ICD codes' })
  @IsOptional()
  @IsArray()
  diagnosis?: string[];

  @ApiPropertyOptional({ description: 'List of advised investigations (X-Ray, MRI, etc.)' })
  @IsOptional()
  @IsArray()
  investigations?: string[];

  @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  followUpDate?: string;

  @ApiPropertyOptional({ type: [CreateTherapyPlanItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTherapyPlanItemDto)
  therapyPlans?: CreateTherapyPlanItemDto[];

  @ApiPropertyOptional({ type: [CreatePrescriptionItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePrescriptionItemDto)
  prescriptionItems?: CreatePrescriptionItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  generalAdvice?: string;
}

export class CreateAssessmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  patientId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  consultationId?: string;

  @ApiProperty({ enum: ['low_back', 'neck', 'knee', 'shoulder', 'neuro'] })
  @IsIn(['low_back', 'neck', 'knee', 'shoulder', 'neuro'])
  templateType!: 'low_back' | 'neck' | 'knee' | 'shoulder' | 'neuro';

  @ApiProperty({ description: 'Key-value mapping of assessment section responses' })
  @IsNotEmpty()
  scoreJson!: Record<string, unknown>;

  @ApiProperty({ description: 'Calculated assessment score (e.g. 0 - 100)' })
  @IsInt()
  totalScore!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  outcomeNotes?: string;
}
