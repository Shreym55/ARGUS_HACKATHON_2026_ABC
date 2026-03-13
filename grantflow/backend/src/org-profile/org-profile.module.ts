import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DrizzleModule } from '../db/drizzle.module';
import { OrgProfileController } from './org-profile.controller';
import { OrgProfileService } from './org-profile.service';

@Module({
  imports: [
    DrizzleModule,
    JwtModule.register({
      secret: process.env.AUTH_SECRET || 'grantflow-local-auth-secret',
    }),
  ],
  controllers: [OrgProfileController],
  providers: [OrgProfileService],
})
export class OrgProfileModule {}
