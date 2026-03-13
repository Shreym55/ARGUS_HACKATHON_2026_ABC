import { Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OrgProfileDto, OrgProfileService } from './org-profile.service';

@Controller('org-profile')
export class OrgProfileController {
  constructor(
    private readonly orgProfileService: OrgProfileService,
    private readonly jwtService: JwtService,
  ) {}

  @Get()
  getProfile(@Headers('authorization') authorization: string) {
    const userId = this.requireUserId(authorization);
    return this.orgProfileService.getProfile(userId);
  }

  @Post()
  upsertProfile(
    @Headers('authorization') authorization: string,
    @Body() dto: OrgProfileDto,
  ) {
    const userId = this.requireUserId(authorization);
    return this.orgProfileService.upsertProfile(userId, dto);
  }

  private requireUserId(authorization: string): string {
    const [scheme, token] = authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException();
    try {
      const payload = this.jwtService.verify<{ sub: string }>(token);
      return payload.sub;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
