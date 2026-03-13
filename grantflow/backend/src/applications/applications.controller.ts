import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ApplicationsService,
  CreateApplicationDto,
  UpdateApplicationDto,
} from './applications.service';

@Controller('applications')
export class ApplicationsController {
  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly jwtService: JwtService,
  ) {}

  /** List current user's applications */
  @Get()
  list(@Headers('authorization') auth: string) {
    const userId = this.requireUserId(auth);
    return this.applicationsService.listForUser(userId);
  }

  /** Get a single application */
  @Get(':id')
  findOne(@Headers('authorization') auth: string, @Param('id') id: string) {
    const userId = this.requireUserId(auth);
    return this.applicationsService.findOne(userId, id);
  }

  /** Create a new draft application */
  @Post()
  create(
    @Headers('authorization') auth: string,
    @Body() dto: CreateApplicationDto,
  ) {
    const userId = this.requireUserId(auth);
    return this.applicationsService.create(userId, dto);
  }

  /** Save wizard step data */
  @Patch(':id')
  update(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationDto,
  ) {
    const userId = this.requireUserId(auth);
    return this.applicationsService.update(userId, id, dto);
  }

  /** Submit the application */
  @Post(':id/submit')
  submit(@Headers('authorization') auth: string, @Param('id') id: string) {
    const userId = this.requireUserId(auth);
    return this.applicationsService.submit(userId, id);
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
