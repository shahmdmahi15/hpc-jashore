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
  LoginDto,
  LogoutDto,
  PinResetDto,
  PinVerifyDto,
  RefreshDto,
} from './dto';
import { JwtAccessAuthGuard, JwtRefreshAuthGuard } from './jwt.guard';
import { CurrentUser, type RequestUser } from '../rbac/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';

function reqMeta(req: Request) {
  return {
    ip: (req.ip ?? req.socket?.remoteAddress ?? null) as string | null,
    userAgent: (req.header('user-agent') ?? null) as string | null,
    requestId: ((req as unknown as { requestId?: string }).requestId ?? null) as string | null,
  };
}

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
  async register(@Body() dto: any, @Req() req: Request) {
    return this.auth.register(dto, reqMeta(req));
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: any, @Req() req: Request) {
    return this.auth.forgotPassword(dto.email, reqMeta(req));
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: any, @Req() req: Request) {
    return this.auth.resetPassword(dto, reqMeta(req));
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: any, @Req() req: Request) {
    return this.auth.verifyEmail(dto, reqMeta(req));
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() dto: any, @Req() req: Request) {
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
    const raw = (req.cookies?.hpc_refresh as string | undefined) ?? dto.refreshToken;
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

  @Post('pin-verify')
  @HttpCode(HttpStatus.OK)
  async pinVerify(@Body() dto: PinVerifyDto, @Req() req: Request) {
    const key = (req.header('idempotency-key') ?? dto.idempotencyKey ?? undefined) as string | undefined;
    return this.auth.pinVerify(
      { deskCode: dto.deskCode, staffId: dto.staffId, pin: dto.pin, idempotencyKey: key },
      reqMeta(req),
    );
  }

  @Post('pin-reset')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAccessAuthGuard, RolesGuard)
  @Roles('admin')
  pinReset(@CurrentUser() user: RequestUser, @Body() dto: PinResetDto, @Req() req: Request) {
    return this.auth.pinReset({ sub: user.sub }, dto.staffId, dto.newPin, reqMeta(req));
  }
}
