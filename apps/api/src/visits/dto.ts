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

  @ApiPropertyOptional({ enum: ['normal', 'emergency', 'package', 'follow_up', 'elderly'] })
  @IsOptional()
  @IsIn(['normal', 'emergency', 'package', 'follow_up', 'elderly'])
  priority?: 'normal' | 'emergency' | 'package' | 'follow_up' | 'elderly';

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
}

export class CallSerialDto {
  @ApiPropertyOptional({ description: 'Doctor chamber room number or code' })
  @IsOptional()
  @IsString()
  chamberCode?: string;
}
