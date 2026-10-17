import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDeskDto {
  @IsString()
  @MaxLength(32)
  code!: string;

  @IsIn(['reception', 'therapy', 'cashier'])
  type!: 'reception' | 'therapy' | 'cashier';

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  roomId?: string;
}

export class UpdateDeskDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  roomId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
