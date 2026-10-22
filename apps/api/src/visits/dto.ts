import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
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
    description: 'Check-in destination department: therapy or consultation',
    enum: ['therapy', 'consultation'],
    default: 'therapy',
  })
  @IsOptional()
  @IsIn(['therapy', 'consultation'])
  destination?: 'therapy' | 'consultation';

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
  @ApiPropertyOptional({ description: 'Optional override chamber room id' })
  @IsOptional()
  @IsString()
  chamberRoomId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CallSerialDto {
  @ApiPropertyOptional({ description: 'Doctor chamber room number or code' })
  @IsOptional()
  @IsString()
  chamberCode?: string;
}
