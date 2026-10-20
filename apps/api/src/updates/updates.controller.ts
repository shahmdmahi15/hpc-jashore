import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CheckUpdateDto, PublishUpdateDto, TauriUpdateQueryDto } from './dto';
import { UpdateAuthGuard } from './update-auth.guard';
import { compareSemver, UpdatesService } from './updates.service';

@ApiTags('updates')
@Controller('updates')
export class UpdatesController {
  constructor(private readonly updatesService: UpdatesService) {}

  @Get('latest.json')
  @ApiOperation({ summary: 'Tauri v2 updater manifest' })
  @ApiResponse({
    status: 200,
    description: 'Tauri v2 update payload with signatures and URLs',
  })
  @ApiResponse({
    status: 204,
    description: 'No newer update available (dynamic updater spec)',
  })
  getLatestTauri(
    @Query() query: TauriUpdateQueryDto,
    @Res() res: Response,
  ) {
    const latest = this.updatesService.getLatestRelease();
    if (!latest) {
      return res.status(HttpStatus.NO_CONTENT).send();
    }

    const clientVersion = query.current_version ?? query.version;
    if (clientVersion && compareSemver(latest.version, clientVersion) <= 0) {
      return res.status(HttpStatus.NO_CONTENT).send();
    }

    const manifest = this.updatesService.getTauriManifest(
      query.target,
      query.arch,
    );
    return res.status(HttpStatus.OK).json(manifest);
  }

  @Get('check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Multi-platform update check for Android / Android TV / mobile',
  })
  checkUpdate(@Query() dto: CheckUpdateDto) {
    return this.updatesService.checkUpdate(dto);
  }

  @Get('download/:platform/:version')
  @ApiOperation({ summary: 'Download or redirect to release asset' })
  @ApiResponse({ status: 302, description: 'Redirect to CDN/Release asset' })
  @ApiResponse({ status: 200, description: 'Direct binary file download' })
  download(
    @Param('platform') platform: string,
    @Param('version') version: string,
    @Res() res: Response,
  ) {
    const target = this.updatesService.getDownloadTarget(platform, version);
    if (target.type === 'redirect') {
      return res.redirect(HttpStatus.FOUND, target.url);
    }
    return res.download(target.filePath);
  }

  @Post('publish')
  @UseGuards(UpdateAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiSecurity('x-update-secret')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Register new release asset from CI/CD pipeline',
  })
  publish(@Body() dto: PublishUpdateDto) {
    return this.updatesService.publishRelease(dto);
  }

  @Get(':target/:arch/:currentVersion')
  @ApiOperation({ summary: 'Tauri v2 dynamic path-based updater route' })
  getDynamicTauri(
    @Param('target') target: string,
    @Param('arch') arch: string,
    @Param('currentVersion') currentVersion: string,
    @Res() res: Response,
  ) {
    const latest = this.updatesService.getLatestRelease();
    if (!latest) {
      return res.status(HttpStatus.NO_CONTENT).send();
    }

    if (currentVersion && compareSemver(latest.version, currentVersion) <= 0) {
      return res.status(HttpStatus.NO_CONTENT).send();
    }

    const manifest = this.updatesService.getTauriManifest(target, arch);
    return res.status(HttpStatus.OK).json(manifest);
  }
}
