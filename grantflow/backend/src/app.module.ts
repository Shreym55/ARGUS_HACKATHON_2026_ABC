import { Module } from '@nestjs/common';
import { DrizzleModule } from './db/drizzle.module';

@Module({
  imports: [DrizzleModule],
})
export class AppModule {}
