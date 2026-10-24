import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  LogoutDto,
  RefreshDto,
  RegisterDto,
  ResendVerificationDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto';
import { JwtAccessAuthGuard, JwtRefreshAuthGuard } from './jwt.guard';
import { CurrentUser, type RequestUser } from '../rbac/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { reqMeta } from '../common/request-ip';

function refreshCookie(res: Response, token: string | null) {
  if (token) {
    res.cookie('hpc_refresh', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  } else {
    res.clearCookie('hpc_refresh', { path: '/api/auth' });
  }
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const out = await this.auth.login(dto.email, dto.password, dto.deviceLabel, reqMeta(req));
    refreshCookie(res, out.refreshToken);
    return out;
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.auth.register(dto, reqMeta(req));
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    return this.auth.forgotPassword(dto.email, reqMeta(req));
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    return this.auth.resetPassword(dto, reqMeta(req));
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto, @Req() req: Request) {
    return this.auth.verifyEmail(dto, reqMeta(req));
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() dto: ResendVerificationDto, @Req() req: Request) {
    return this.auth.resendVerification(dto.email, reqMeta(req));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshAuthGuard)
  async refresh(@Body() _dto: RefreshDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw =
      (req.cookies?.hpc_refresh as string | undefined) ?? _dto.refreshToken ?? '';
    const out = await this.auth.refresh(raw, reqMeta(req));
    refreshCookie(res, out.refreshToken);
    return out;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: LogoutDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const authHeader = req.headers.authorization;
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const raw = (req.cookies?.hpc_refresh as string | undefined) ?? dto.refreshToken ?? bearer;
    const out = await this.auth.logout(raw, reqMeta(req));
    refreshCookie(res, null);
    return out;
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard)
  me(@CurrentUser() user: RequestUser) {
    return this.auth.me(user.sub);
  }

  @Get('sessions')
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard)
  sessions(@CurrentUser() user: RequestUser) {
    return this.auth.mySessions(user.sub);
  }

  @Delete('sessions/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard)
  revoke(@CurrentUser() user: RequestUser, @Param('id') id: string, @Req() req: Request) {
    return this.auth.revokeSession({ sub: user.sub, role: user.role }, id, reqMeta(req));
  }
}
