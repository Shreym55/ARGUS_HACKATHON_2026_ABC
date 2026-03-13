import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DrizzleModule } from './db/drizzle.module';
import { GrantProgramsModule } from './grant-programs/grant-programs.module';
import { OrgProfileModule } from './org-profile/org-profile.module';
import { DocumentVaultModule } from './document-vault/document-vault.module';
import { ApplicationsModule } from './applications/applications.module';

@Module({
  imports: [
    DrizzleModule,
    AuthModule,
    GrantProgramsModule,
    OrgProfileModule,
    DocumentVaultModule,
    ApplicationsModule,
  ],
})
export class AppModule {}
