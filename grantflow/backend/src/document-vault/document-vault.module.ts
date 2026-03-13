import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DrizzleModule } from '../db/drizzle.module';
import { DocumentVaultController } from './document-vault.controller';
import { DocumentVaultService } from './document-vault.service';

@Module({
  imports: [
    DrizzleModule,
    JwtModule.register({
      secret: process.env.AUTH_SECRET || 'grantflow-local-auth-secret',
    }),
  ],
  controllers: [DocumentVaultController],
  providers: [DocumentVaultService],
})
export class DocumentVaultModule {}
