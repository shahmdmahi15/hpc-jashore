import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ROOM_GENDERS, ROOM_STATUSES, ROOM_TYPES, type RoomGender, type RoomStatus, type RoomType } from '../db/schema';

export class CreateRoomDto {
  @ApiProperty({ description: 'Unique room identifier/number e.g. DOC-101, TH-01', example: 'DOC-101' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  roomNumber!: string;

  @ApiProperty({ description: 'Display name of the room', example: 'Doctor Consultation Chamber 1 (Dr. Toufiq)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name!: string;

  @ApiProperty({
    description: 'Room functional classification',
    enum: [
      'waiting_room',
      'public_room',
      'private_room',
      'doctor_consultation_room',
      'therapy_room',
      'therapy_hall',
      'staff_room',
      'cashier_room',
    ],
    example: 'doctor_consultation_room',
  })
  @IsIn([
    'waiting_room',
    'public_room',
    'private_room',
    'doctor_consultation_room',
    'therapy_room',
    'therapy_hall',
    'staff_room',
    'cashier_room',
  ])
  type!: RoomType;

  @ApiPropertyOptional({
    description: 'Room gender policy',
    enum: ['common', 'male', 'female'],
    default: 'common',
  })
  @IsOptional()
  @IsIn(['common', 'male', 'female'])
  gender?: RoomGender;

  @ApiPropertyOptional({
    description: 'Operational status of the room',
    enum: ['available', 'occupied', 'maintenance', 'not_allowed'],
    default: 'available',
  })
  @IsOptional()
  @IsIn(['available', 'occupied', 'maintenance', 'not_allowed'])
  status?: RoomStatus;

  @ApiPropertyOptional({
    description: 'Room capacity (number of patients / beds / occupants)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ description: 'Operational notes, facilities or equipment information' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateRoomDto {
  @ApiPropertyOptional({ description: 'Room number / code' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  roomNumber?: string;

  @ApiPropertyOptional({ description: 'Display name of the room' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string;

  @ApiPropertyOptional({
    description: 'Room functional classification',
    enum: [
      'waiting_room',
      'public_room',
      'private_room',
      'doctor_consultation_room',
      'therapy_room',
      'therapy_hall',
      'staff_room',
      'cashier_room',
    ],
  })
  @IsOptional()
  @IsIn([
    'waiting_room',
    'public_room',
    'private_room',
    'doctor_consultation_room',
    'therapy_room',
    'therapy_hall',
    'staff_room',
    'cashier_room',
  ])
  type?: RoomType;

  @ApiPropertyOptional({
    description: 'Room gender policy',
    enum: ['common', 'male', 'female'],
  })
  @IsOptional()
  @IsIn(['common', 'male', 'female'])
  gender?: RoomGender;

  @ApiPropertyOptional({
    description: 'Operational status of the room',
    enum: ['available', 'occupied', 'maintenance', 'not_allowed'],
  })
  @IsOptional()
  @IsIn(['available', 'occupied', 'maintenance', 'not_allowed'])
  status?: RoomStatus;

  @ApiPropertyOptional({ description: 'Room capacity (number of patients / beds / occupants)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ description: 'Operational notes or remarks' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Active toggle (1 or 0)' })
  @IsOptional()
  @IsInt()
  isActive?: number;
}

export class UpdateRoomStatusDto {
  @ApiProperty({
    description: 'Quick operational status change',
    enum: ['available', 'occupied', 'maintenance', 'not_allowed'],
  })
  @IsIn(['available', 'occupied', 'maintenance', 'not_allowed'])
  status!: RoomStatus;
}

export class RoomQueryDto {
  @ApiPropertyOptional({ description: 'Search keyword matching roomNumber, name or notes' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: 'Filter by room type or "all"' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Filter by room gender or "all"' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ description: 'Filter by room status or "all"' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Results per page', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;
}
