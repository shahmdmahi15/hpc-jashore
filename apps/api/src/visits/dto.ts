import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CheckInDto {
  @ApiProperty({ description: 'Existing patient UUID or MRN' })
  @IsString()
  @IsNotEmpty()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Assigned doctor staff UUID' })
  @IsOptional()
  @IsString()
  doctorId?: string;

  @ApiPropertyOptional({
    description: 'Check-in destination department: therapy, consultation, or waiting_room',
    enum: ['therapy', 'consultation', 'waiting_room'],
    default: 'waiting_room',
  })
  @IsOptional()
  @IsIn(['therapy', 'consultation', 'waiting_room'])
  destination?: 'therapy' | 'consultation' | 'waiting_room';

  @ApiPropertyOptional({ enum: ['normal', 'emergency', 'package', 'follow_up', 'elderly'] })
  @IsOptional()
  @IsIn(['normal', 'emergency', 'package', 'follow_up', 'elderly'])
  priority?: 'normal' | 'emergency' | 'package' | 'follow_up' | 'elderly';

  @ApiPropertyOptional({ description: 'Specific therapy slot booking ID if checking in for booked slot' })
  @IsOptional()
  @IsString()
  therapyBookingId?: string;

  @ApiPropertyOptional({ description: 'Specific consultation booking ID if checking in for booked doctor' })
  @IsOptional()
  @IsString()
  consultationBookingId?: string;

  @ApiPropertyOptional({ description: 'Manually instructed told time if overriding booking' })
  @IsOptional()
  @IsString()
  toldTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RoutePatientDto {
  @ApiProperty({ description: 'Next location: consult, therapy, cashier, exit' })
  @IsString()
  @IsNotEmpty()
  location!: string;

  @ApiPropertyOptional({ description: 'Assigned target staff or room id' })
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CheckOutDto {
  @ApiPropertyOptional({ description: 'Optional checkout approval notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Allow checkout even with unsettled dues with reason' })
  @IsOptional()
  allowWithDues?: boolean;

  @ApiPropertyOptional({ description: 'Reason for allowing checkout with dues' })
  @IsOptional()
  @IsString()
  dueReason?: string;

  @ApiPropertyOptional({ description: 'Next scheduled follow-up appointment date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  nextFollowUpDate?: string;
}

export class SendToDoctorQueueDto {
  @ApiPropertyOptional({ description: 'Target doctor user ID' })
  @IsOptional()
  @IsString()
  doctorId?: string;

  @ApiPropertyOptional({ description: 'Reason for visit (e.g. Report showing, consultation)' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Optional override chamber room id' })
  @IsOptional()
  @IsString()
  chamberRoomId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Whether consultation is free (৳0)' })
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @ApiPropertyOptional({ description: 'Consultation fee in Taka if fee-based' })
  @IsOptional()
  @IsInt()
  feeTaka?: number;
}

export class CallSerialDto {
  @ApiPropertyOptional({ description: 'Doctor chamber room number or code' })
  @IsOptional()
  @IsString()
  chamberCode?: string;
}

export class RequestConsultationAdjustmentDto {
  @ApiProperty({ enum: ['refund', 'payment_collection'] })
  @IsIn(['refund', 'payment_collection'])
  adjustmentType!: 'refund' | 'payment_collection';

  @ApiProperty({ description: 'Adjustment amount in taka' })
  @IsInt()
  @Min(1)
  amountTaka!: number;

  @ApiProperty({ description: 'Reason for adjustment' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class ProcessConsultationAdjustmentDto {
  @ApiProperty({ enum: ['completed', 'rejected'] })
  @IsIn(['completed', 'rejected'])
  status!: 'completed' | 'rejected';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  txnId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
