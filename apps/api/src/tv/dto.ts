import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterTvDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  pairingCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  appVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceName?: string;
}

export class HeartbeatTvDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  pairingCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  appVersion?: string;
}

export class PairTvDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  pairingCode!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  deviceName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  location?: string;

  @IsOptional()
  @IsIn(['ALL', 'CONSULTATION', 'THERAPY'])
  department?: 'ALL' | 'CONSULTATION' | 'THERAPY';

  @IsOptional()
  @IsIn(['dark', 'light'])
  theme?: 'dark' | 'light';

  @IsOptional()
  @IsIn(['bn', 'en'])
  language?: 'bn' | 'en';
}

export class UpdateTvDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceName?: string;

  @IsOptional()
  @IsIn(['ALL', 'CONSULTATION', 'THERAPY'])
  department?: 'ALL' | 'CONSULTATION' | 'THERAPY';

  @IsOptional()
  @IsIn(['dark', 'light'])
  theme?: 'dark' | 'light';

  @IsOptional()
  @IsIn(['bn', 'en'])
  language?: 'bn' | 'en';

  @IsOptional()
  @IsString()
  @MaxLength(128)
  location?: string;

  @IsOptional()
  @IsIn(['pending', 'paired', 'revoked'])
  status?: 'pending' | 'paired' | 'revoked';
}
