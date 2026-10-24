import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAccessAuthGuard, JwtRefreshAuthGuard } from './jwt.guard';
import { AccessStrategy, RefreshStrategy } from './jwt.strategy';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, AccessStrategy, RefreshStrategy, JwtAccessAuthGuard, JwtRefreshAuthGuard],
  exports: [AuthService, JwtAccessAuthGuard, JwtRefreshAuthGuard],
})
export class AuthModule {}
