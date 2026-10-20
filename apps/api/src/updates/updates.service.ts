import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { CheckUpdateDto, PublishUpdateDto } from './dto';

export interface PlatformRelease {
  url: string;
  signature?: string;
  versionCode?: number;
}

export interface ReleaseEntry {
  version: string;
  notes?: string;
  pub_date: string;
  forceUpdate?: boolean;
  minVersionCode?: number;
  platforms: Record<string, PlatformRelease>;
}

export interface UpdatesRegistry {
  releases: ReleaseEntry[];
}

export interface TauriV2Response {
  version: string;
  notes: string;
  pub_date: string;
  platforms: Record<string, { signature: string; url: string }>;
}

export interface CheckUpdateResponse {
  updateAvailable: boolean;
  latestVersion: string;
  versionCode: number;
  apkUrl: string;
  notes: string;
  forceUpdate: boolean;
}

export type DownloadTarget =
  | { type: 'redirect'; url: string }
  | { type: 'file'; filePath: string };

export function compareSemver(v1: string, v2: string): number {
  const clean = (v: string) => v.replace(/^v/i, '').trim();
  const c1 = clean(v1);
  const c2 = clean(v2);

  const core1 = c1.split('-')[0] ?? '';
  const core2 = c2.split('-')[0] ?? '';

  const parts1 = core1.split('.').map((n) => parseInt(n, 10) || 0);
  const parts2 = core2.split('.').map((n) => parseInt(n, 10) || 0);

  const len = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < len; i++) {
    const p1 = parts1[i] ?? 0;
    const p2 = parts2[i] ?? 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

@Injectable()
export class UpdatesService implements OnModuleInit {
  private readonly logger = new Logger(UpdatesService.name);
  private registry: UpdatesRegistry = { releases: [] };
  private registryFilePath!: string;

  onModuleInit() {
    this.registryFilePath = this.resolveRegistryPath();
    this.loadRegistry();
  }

  private resolveRegistryPath(): string {
    if (process.env.UPDATES_REGISTRY_PATH) {
      return path.resolve(process.env.UPDATES_REGISTRY_PATH);
    }
    const cwd = process.cwd();
    // Check if running from monorepo root or apps/api
    if (fs.existsSync(path.join(cwd, 'apps', 'api', 'data'))) {
      return path.join(cwd, 'apps', 'api', 'data', 'updates-registry.json');
    }
    return path.join(cwd, 'data', 'updates-registry.json');
  }

  private loadRegistry(): void {
    try {
      if (fs.existsSync(this.registryFilePath)) {
        const data = fs.readFileSync(this.registryFilePath, 'utf-8');
        this.registry = JSON.parse(data);
        this.logger.log(
          `Loaded ${this.registry.releases?.length ?? 0} release(s) from ${this.registryFilePath}`,
        );
        return;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Failed to read updates registry from ${this.registryFilePath}: ${msg}. Initializing seed.`,
      );
    }

    // Default initial v0.1.0 release seed
    this.registry = this.createInitialSeed();
    this.saveRegistry();
  }

  private saveRegistry(): void {
    try {
      const dir = path.dirname(this.registryFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        this.registryFilePath,
        JSON.stringify(this.registry, null, 2),
        'utf-8',
      );
      this.logger.log(`Updates registry saved to ${this.registryFilePath}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to save updates registry to ${this.registryFilePath}: ${msg}. In-memory fallback active.`,
      );
    }
  }

  private createInitialSeed(): UpdatesRegistry {
    return {
      releases: [
        {
          version: '0.1.0',
          notes: 'HPC Jashore v0.1.0 initial release for Windows, Android, and Android TV.',
          pub_date: '2026-10-20T00:00:00.000Z',
          forceUpdate: false,
          minVersionCode: 1,
          platforms: {
            'windows-x86_64': {
              signature: '',
              url: 'https://github.com/shahmdmahi15/hpc-jashore/releases/download/v0.1.0/hpc-jashore_0.1.0_x64-setup.exe',
            },
            'android': {
              versionCode: 1,
              url: 'https://github.com/shahmdmahi15/hpc-jashore/releases/download/v0.1.0/hpc-jashore-mobile.apk',
            },
            'android-tv': {
              versionCode: 1,
              url: 'https://github.com/shahmdmahi15/hpc-jashore/releases/download/v0.1.0/hpc-jashore-tv.apk',
            },
          },
        },
      ],
    };
  }

  getLatestRelease(): ReleaseEntry | null {
    if (!this.registry.releases || this.registry.releases.length === 0) {
      return null;
    }
    const sorted = [...this.registry.releases].sort((a, b) =>
      compareSemver(b.version, a.version),
    );
    return sorted[0] ?? null;
  }

  getRelease(version: string): ReleaseEntry | null {
    const cleanTarget = version.replace(/^v/i, '').trim();
    if (cleanTarget === 'latest') {
      return this.getLatestRelease();
    }
    return (
      this.registry.releases.find(
        (r) => r.version.replace(/^v/i, '').trim() === cleanTarget,
      ) ?? null
    );
  }

  getTauriManifest(target?: string, arch?: string): TauriV2Response {
    const latest = this.getLatestRelease();
    if (!latest) {
      throw new NotFoundException('No releases registered');
    }

    const platforms: Record<string, { signature: string; url: string }> = {};

    if (target && arch) {
      const specificKey = `${target}-${arch}`.toLowerCase();
      if (latest.platforms[specificKey]) {
        platforms[specificKey] = {
          signature: latest.platforms[specificKey].signature ?? '',
          url: latest.platforms[specificKey].url,
        };
      }
    }

    // If specific platform not found or target/arch omitted, include all desktop platforms
    if (Object.keys(platforms).length === 0) {
      for (const [key, p] of Object.entries(latest.platforms)) {
        if (
          key.startsWith('windows') ||
          key.startsWith('darwin') ||
          key.startsWith('linux')
        ) {
          platforms[key] = {
            signature: p.signature ?? '',
            url: p.url,
          };
        }
      }
    }

    return {
      version: latest.version,
      notes: latest.notes ?? '',
      pub_date: latest.pub_date,
      platforms,
    };
  }

  checkUpdate(dto: CheckUpdateDto): CheckUpdateResponse {
    const targetPlatform = dto.platform.trim().toLowerCase();

    // Find latest release containing the target platform
    const sorted = [...this.registry.releases].sort((a, b) =>
      compareSemver(b.version, a.version),
    );

    let matchedRelease: ReleaseEntry | null = null;
    let matchedPlatformRelease: PlatformRelease | null = null;

    for (const rel of sorted) {
      const pEntry =
        rel.platforms[targetPlatform] ??
        Object.entries(rel.platforms).find(([k]) =>
          k.toLowerCase().includes(targetPlatform),
        )?.[1];

      if (pEntry) {
        matchedRelease = rel;
        matchedPlatformRelease = pEntry;
        break;
      }
    }

    if (!matchedRelease || !matchedPlatformRelease) {
      const latestOverall = this.getLatestRelease();
      return {
        updateAvailable: false,
        latestVersion: latestOverall?.version ?? '0.0.0',
        versionCode: 0,
        apkUrl: '',
        notes: `No release available for platform "${dto.platform}".`,
        forceUpdate: false,
      };
    }

    const latestCode = matchedPlatformRelease.versionCode ?? 1;
    let isNewer = false;

    if (dto.versionCode !== undefined) {
      isNewer = latestCode > dto.versionCode;
    } else if (dto.versionName) {
      isNewer = compareSemver(matchedRelease.version, dto.versionName) > 0;
    } else {
      isNewer = true;
    }

    const force = Boolean(
      matchedRelease.forceUpdate ||
        (matchedRelease.minVersionCode !== undefined &&
          dto.versionCode !== undefined &&
          dto.versionCode < matchedRelease.minVersionCode),
    );

    return {
      updateAvailable: isNewer,
      latestVersion: matchedRelease.version,
      versionCode: latestCode,
      apkUrl: matchedPlatformRelease.url,
      notes: matchedRelease.notes ?? '',
      forceUpdate: isNewer && force,
    };
  }

  getDownloadTarget(platform: string, version: string): DownloadTarget {
    const release = this.getRelease(version);
    if (!release) {
      throw new NotFoundException(
        `Release version "${version}" was not found.`,
      );
    }

    const targetPlatform = platform.trim().toLowerCase();
    const platformRelease =
      release.platforms[targetPlatform] ??
      Object.entries(release.platforms).find(([k]) =>
        k.toLowerCase().includes(targetPlatform),
      )?.[1];

    if (!platformRelease) {
      throw new NotFoundException(
        `No binary registered for platform "${platform}" in release "${version}".`,
      );
    }

    const targetUrl = platformRelease.url.trim();
    if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
      return { type: 'redirect', url: targetUrl };
    }

    // Check local filesystem
    const candidates = [
      path.resolve(targetUrl),
      path.resolve(process.cwd(), targetUrl),
      path.resolve(process.cwd(), 'data', 'releases', targetUrl),
      path.resolve(path.dirname(this.registryFilePath), 'releases', targetUrl),
    ];

    for (const cand of candidates) {
      if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
        return { type: 'file', filePath: cand };
      }
    }

    throw new NotFoundException(
      `Binary asset file for "${platform}" not found on server storage: ${targetUrl}`,
    );
  }

  publishRelease(dto: PublishUpdateDto) {
    const cleanVer = dto.version.replace(/^v/i, '').trim();
    const platformKey = dto.platform.trim().toLowerCase();
    const targetUrl = (dto.url || dto.downloadUrl || '').trim();

    if (!targetUrl) {
      throw new BadRequestException(
        'Either "url" or "downloadUrl" must be provided in release payload.',
      );
    }

    let release = this.registry.releases.find(
      (r) => r.version.replace(/^v/i, '').trim() === cleanVer,
    );

    if (release) {
      if (dto.notes) release.notes = dto.notes;
      if (dto.pubDate) release.pub_date = dto.pubDate;
      if (dto.forceUpdate !== undefined) release.forceUpdate = dto.forceUpdate;
      if (dto.minVersionCode !== undefined)
        release.minVersionCode = dto.minVersionCode;

      release.platforms[platformKey] = {
        url: targetUrl,
        signature: dto.signature,
        versionCode: dto.versionCode,
      };
    } else {
      release = {
        version: cleanVer,
        notes: dto.notes ?? `Release v${cleanVer}`,
        pub_date: dto.pubDate ?? new Date().toISOString(),
        forceUpdate: dto.forceUpdate ?? false,
        minVersionCode: dto.minVersionCode,
        platforms: {
          [platformKey]: {
            url: targetUrl,
            signature: dto.signature,
            versionCode: dto.versionCode,
          },
        },
      };
      this.registry.releases.push(release);
    }

    this.saveRegistry();

    return {
      success: true,
      message: `Successfully published update for ${platformKey} on v${cleanVer}`,
      release,
    };
  }

  getRegistry(): UpdatesRegistry {
    return this.registry;
  }
}
