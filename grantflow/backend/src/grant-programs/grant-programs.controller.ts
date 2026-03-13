import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EligibilityCheckDto, GrantProgramsService } from './grant-programs.service';

@Controller('grant-programs')
export class GrantProgramsController {
  constructor(
    private readonly grantProgramsService: GrantProgramsService,
    private readonly jwtService: JwtService,
  ) {}

  /** Public — list all active grant programmes */
  @Get()
  findAll() {
    return this.grantProgramsService.findAll();
  }

  /**
   * Authenticated (optional) — personalised eligibility based on saved org profile.
   * Returns { hasProfile: false } if the user has no org or no token is provided.
   */
  @Get('my-eligibility')
  myEligibility(@Headers('authorization') authorization?: string) {
    const userId = this.extractUserId(authorization);
    if (!userId) return { hasProfile: false, results: [] };
    return this.grantProgramsService.getPersonalisedEligibility(userId);
  }

  /** Public — get a single grant programme by ID */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.grantProgramsService.findOne(id);
  }

  /** Public — run hard-rule eligibility pre-check */
  @Post('eligibility-check')
  checkEligibility(@Body() dto: EligibilityCheckDto) {
    return this.grantProgramsService.checkEligibility(dto);
  }

  private extractUserId(authorization?: string): string | null {
    const [scheme, token] = authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) return null;
    try {
      const payload = this.jwtService.verify<{ sub: string }>(token);
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }
}
