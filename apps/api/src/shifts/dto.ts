import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateShiftDto {
  @IsString()
  @MaxLength(64)
  staffId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  deskId?: string;

  @IsDateString()
  startsAt!: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsIn(['scheduled', 'active', 'closed'])
  status?: string;
}

export class UpdateShiftDto {
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsIn(['scheduled', 'active', 'closed'])
  status?: string;
}
