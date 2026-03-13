import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DrizzleModule } from './db/drizzle.module';

@Module({
  imports: [DrizzleModule, AuthModule],
})
export class AppModule {}
