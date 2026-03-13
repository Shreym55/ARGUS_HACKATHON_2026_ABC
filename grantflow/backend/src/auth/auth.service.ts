import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.provider';
import { users } from '../db/schema';

type PublicUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
};

type TokenPayload = {
  sub: string;
  email: string;
  role: string;
};

export type RegisterDto = {
  email?: string;
  password?: string;
  fullName?: string;
};

export type LoginDto = {
  email?: string;
  password?: string;
};

export type AuthResponse = {
  token: string;
  user: PublicUser;
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: any,
    private readonly jwtService: JwtService,
  ) {}

  async register(body: RegisterDto): Promise<AuthResponse> {
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();
    const fullName = body.fullName?.trim();

    if (!email || !password || !fullName) {
      throw new BadRequestException('Email, password, and full name are required.');
    }

    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters.');
    }

    const existingUser = await this.findUserByEmail(email);

    if (existingUser) {
      throw new ConflictException('An account with this email already exists.');
    }

    const [createdUser] = await this.db
      .insert(users)
      .values({
        email,
        fullName,
        passwordHash: this.hashPassword(password),
        role: 'applicant',
      })
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
      });

    return {
      token: await this.signToken(createdUser),
      user: createdUser,
    };
  }

  async login(body: LoginDto): Promise<AuthResponse> {
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();

    if (!email || !password) {
      throw new BadRequestException('Email and password are required.');
    }

    const user = await this.findUserByEmail(email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordState = this.verifyPassword(password, user.passwordHash);

    if (!passwordState.isValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    await this.db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        updatedAt: new Date(),
        ...(passwordState.needsRehash ? { passwordHash: this.hashPassword(password) } : {}),
      })
      .where(eq(users.id, user.id));

    return {
      token: await this.signToken(user),
      user: this.toPublicUser(user),
    };
  }

  async getCurrentUser(authorization?: string): Promise<{ user: PublicUser }> {
    const token = this.extractBearerToken(authorization);
    const payload = await this.verifyToken(token);

    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Session is no longer valid.');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  private async findUserByEmail(email: string) {
    const [user] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  private toPublicUser(user: typeof users.$inferSelect): PublicUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  private verifyPassword(password: string, storedHash: string): {
    isValid: boolean;
    needsRehash: boolean;
  } {
    const [salt, originalHash] = storedHash.split(':');

    if (!salt || !originalHash) {
      const legacyHash = createHash('sha256').update(password).digest('hex');
      return {
        isValid: timingSafeEqual(Buffer.from(legacyHash), Buffer.from(storedHash)),
        needsRehash: true,
      };
    }

    const hash = scryptSync(password, salt, 64);
    const original = Buffer.from(originalHash, 'hex');

    if (hash.length !== original.length) {
      return { isValid: false, needsRehash: false };
    }

    return {
      isValid: timingSafeEqual(hash, original),
      needsRehash: false,
    };
  }

  private async signToken(user: Pick<typeof users.$inferSelect, 'id' | 'email' | 'role'>): Promise<string> {
    return this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  private async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(token);

      if (!payload.sub) {
        throw new UnauthorizedException('Malformed token payload.');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }
  }

  private extractBearerToken(authorization?: string): string {
    const [scheme, token] = authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Authorization header is required.');
    }

    return token;
  }
}
