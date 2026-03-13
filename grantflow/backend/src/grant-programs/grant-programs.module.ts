import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DrizzleModule } from '../db/drizzle.module';
import { GrantProgramsController } from './grant-programs.controller';
import { GrantProgramsService } from './grant-programs.service';

@Module({
  imports: [
    DrizzleModule,
    JwtModule.register({
      secret: process.env.AUTH_SECRET || 'grantflow-local-auth-secret',
    }),
  ],
  controllers: [GrantProgramsController],
  providers: [GrantProgramsService],
})
export class GrantProgramsModule {}
