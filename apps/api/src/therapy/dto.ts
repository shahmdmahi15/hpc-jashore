import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class StartSessionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  patientId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  modalityCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  planId?: string;

  @ApiPropertyOptional({ description: 'Therapy hall bed UUID' })
  @IsOptional()
  @IsString()
  bedId?: string;

  @ApiPropertyOptional({ description: 'Therapist staff UUID' })
  @IsOptional()
  @IsString()
  therapistStaffId?: string;

  @ApiPropertyOptional({ description: 'Session duration in minutes' })
  @IsOptional()
  @IsInt()
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Therapy room UUID' })
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiPropertyOptional({ description: 'Active visit UUID' })
  @IsOptional()
  @IsString()
  visitId?: string;

  @ApiPropertyOptional({ description: 'Session notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CompleteSessionDto {
  @ApiPropertyOptional({ description: 'Actual duration in minutes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  outcomeNote?: string;

  @ApiPropertyOptional({ description: 'Session notes alias for outcomeNote' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'VAS Pain score post-session (0-10)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  painScoreAfter?: number;
}

export class CreateBedDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  roomId!: string;

  @ApiProperty({ example: 'BED-A1' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: 'Bed A-1' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class CreatePackageDto {
  @ApiProperty({ example: 'Back Pain Relief 10-Session Package' })
  @IsString()
  @IsNotEmpty()
  nameEn!: string;

  @ApiPropertyOptional({ example: 'কোমর ব্যথা নিরাময় ১০ সেশন প্যাকেজ' })
  @IsOptional()
  @IsString()
  nameBn?: string;

  @ApiPropertyOptional({ enum: ['per_session', 'per_day'], default: 'per_session' })
  @IsOptional()
  @IsIn(['per_session', 'per_day'])
  packageType?: 'per_session' | 'per_day';

  @ApiPropertyOptional({ example: 9999, description: 'Total consultations included' })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalConsultations?: number;

  @ApiPropertyOptional({ example: 10, description: 'Total therapy sessions (for per_session)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalTherapySessions?: number;

  @ApiPropertyOptional({ example: 10, description: 'Total days (for per_day)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalDays?: number;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(1)
  validityDays!: number;

  @ApiPropertyOptional({ example: 500000, description: 'Price in paisa (e.g. 5000 BDT = 500000 paisa)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  pricePaisa?: number;

  @ApiPropertyOptional({ example: 5000, description: 'Price in BDT (converted to pricePaisa if pricePaisa omitted)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  priceBdt?: number;
}

export class PurchasePackageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  patientId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  packageId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  billId?: string;

  @ApiPropertyOptional({ description: 'Custom total days override for per_day packages' })
  @IsOptional()
  @IsInt()
  @Min(1)
  customDays?: number;

  @ApiPropertyOptional({ description: 'Custom total sessions override for per_session packages' })
  @IsOptional()
  @IsInt()
  @Min(1)
  customSessions?: number;

  @ApiPropertyOptional({ description: 'Custom price in BDT' })
  @IsOptional()
  @IsInt()
  @Min(0)
  customPriceBdt?: number;

  @ApiPropertyOptional({ description: 'Custom price in paisa' })
  @IsOptional()
  @IsInt()
  @Min(0)
  customPricePaisa?: number;

  @ApiPropertyOptional({ description: 'Custom validity days override' })
  @IsOptional()
  @IsInt()
  @Min(1)
  customValidityDays?: number;
}

export class CallTherapyPatientDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  visitId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  roomId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roomName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  roomNumber?: string | number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modalityCode?: string;
}

export class MarkInTherapyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  visitId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roomName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  modalityCode?: string;
}

export class RecallTherapyPatientDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  visitId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roomId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roomName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  roomNumber?: number;
}

export class CancelTherapyCallDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  visitId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bookingId?: string;
}

export class SendToCashierDto {
  @ApiProperty({ description: 'Active visit UUID' })
  @IsString()
  @IsNotEmpty()
  visitId!: string;

  @ApiProperty({ description: 'Patient UUID' })
  @IsString()
  @IsNotEmpty()
  patientId!: string;

  @ApiProperty({ description: 'Fixed therapy fee in Taka', example: 500 })
  @IsNumber()
  @Min(0)
  feeTaka!: number;

  @ApiPropertyOptional({ description: 'Therapy modality code (defaults to PHYSIO)', example: 'PHYSIO' })
  @IsOptional()
  @IsString()
  modalityCode?: string;

  @ApiPropertyOptional({ description: 'Handler notes or billing memo' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SwitchTherapyRoomDto {
  @ApiProperty({ description: 'Visit UUID to switch room' })
  @IsString()
  @IsNotEmpty()
  visitId!: string;

  @ApiProperty({ description: 'Target Room UUID' })
  @IsString()
  @IsNotEmpty()
  targetRoomId!: string;
}

export class CreateTherapyPlansDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsString()
  @IsNotEmpty()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Visit UUID' })
  @IsOptional()
  @IsString()
  visitId?: string;

  @ApiPropertyOptional({ description: 'Consultation UUID' })
  @IsOptional()
  @IsString()
  consultationId?: string;

  @ApiProperty({ description: 'Array of therapy plans' })
  @IsArray()
  plans!: Array<{
    modalityCode: string;
    totalSessionsPrescribed: number;
    frequency?: string;
    notes?: string;
  }>;
}
