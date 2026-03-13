import {
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DocumentVaultService } from './document-vault.service';

const VAULT_DOC_TYPES = [
  'registration_certificate',
  'audited_financials',
  '80g_certificate',
];

type UploadedVaultFile = {
  originalname: string;
  path: string;
  size: number;
  mimetype: string;
};

@Controller('document-vault')
export class DocumentVaultController {
  constructor(
    private readonly documentVaultService: DocumentVaultService,
    private readonly jwtService: JwtService,
  ) {}

  @Get()
  list(@Headers('authorization') auth: string) {
    const userId = this.requireUserId(auth);
    return this.documentVaultService.listDocuments(userId);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/vault',
        filename: (_req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  async upload(
    @Headers('authorization') auth: string,
    @Query('documentType') documentType: string,
    @UploadedFile() file: UploadedVaultFile,
  ) {
    const userId = this.requireUserId(auth);

    if (!file) throw new BadRequestException('No file uploaded.');
    if (!VAULT_DOC_TYPES.includes(documentType)) {
      throw new BadRequestException(`Invalid document type. Must be one of: ${VAULT_DOC_TYPES.join(', ')}`);
    }

    return this.documentVaultService.upsertDocument(
      userId,
      documentType,
      file.originalname,
      file.path,
      file.size,
      file.mimetype,
    );
  }

  @Delete(':id')
  delete(@Headers('authorization') auth: string, @Param('id') id: string) {
    const userId = this.requireUserId(auth);
    return this.documentVaultService.deleteDocument(userId, id);
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
