// apps/api/src/consultation-bookings/dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import type { ConsultationVisitType } from '../db/schema';

export class CreateConsultationBookingDto {
  @ApiProperty({ description: 'Patient UUID or MRN' })
  @IsString()
  @IsNotEmpty()
  patientId!: string;

  @ApiProperty({ description: 'Doctor staff UUID' })
  @IsString()
  @IsNotEmpty()
  doctorId!: string;

  @ApiProperty({ description: 'Booking date (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  bookingDate!: string;

  @ApiProperty({ description: 'Scheduled slot time e.g. "10:30 AM"' })
  @IsString()
  @IsNotEmpty()
  slotTime!: string;

  @ApiPropertyOptional({ description: 'Instructional told time to patient e.g. "10:15 AM"' })
  @IsOptional()
  @IsString()
  toldTime?: string;

  @ApiPropertyOptional({
    description: 'Consultation visit type',
    enum: ['new_consultation', 'follow_up', 'report_review'],
    default: 'new_consultation',
  })
  @IsOptional()
  @IsIn(['new_consultation', 'follow_up', 'report_review'])
  visitType?: ConsultationVisitType;

  @ApiPropertyOptional({ description: 'Fee amount in Taka' })
  @IsOptional()
  @IsInt()
  @Min(0)
  feeTaka?: number;

  @ApiPropertyOptional({ description: 'Fee amount in Paisa' })
  @IsOptional()
  @IsInt()
  @Min(0)
  feePaisa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CancelConsultationBookingDto {
  @ApiPropertyOptional({ description: 'Reason for cancellation' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SendToDoctorQueueDto {
  @ApiPropertyOptional({ description: 'Assigned chamber room ID override' })
  @IsOptional()
  @IsString()
  chamberRoomId?: string;

  @ApiPropertyOptional({ description: 'Operational notes e.g. cash collected by cashier' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CheckInConsultationBookingDto {
  @ApiPropertyOptional({ description: 'Optional told time override' })
  @IsOptional()
  @IsString()
  toldTime?: string;

  @ApiPropertyOptional({ description: 'Check-in reception notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ListConsultationBookingsQueryDto {
  @ApiPropertyOptional({ description: 'Booking date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ description: 'Doctor staff UUID' })
  @IsOptional()
  @IsString()
  doctorId?: string;

  @ApiPropertyOptional({ description: 'Patient UUID' })
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Booking status filter' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Search query for patient name/phone/mrn' })
  @IsOptional()
  @IsString()
  search?: string;
}
