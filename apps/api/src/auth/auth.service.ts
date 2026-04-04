import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import * as argon2 from 'argon2';
import { DB } from '../db/db.module';
import { DbType } from '../db/db.module';
import { users } from '../db/schema';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private db: DbType,
    private jwtService: JwtService,
  ) {}

  // Dummy hash used for constant-time response when user is not found (prevents timing-based email enumeration)
  private static readonly DUMMY_HASH = '$argon2id$v=19$m=65536,t=3,p=4$dW5rbm93bg$dW5rbm93bg';

  async login(dto: LoginDto) {
    const [user] = await this.db.select().from(users).where(eq(users.email, dto.email)).limit(1);

    // Always run argon2.verify to prevent timing-based email enumeration
    const hashToVerify = user?.passwordHash ?? AuthService.DUMMY_HASH;
    const valid = await argon2.verify(hashToVerify, dto.password).catch(() => false);

    if (!user?.passwordHash || !valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.disabled) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Minimal JWT payload — name is PII and can be fetched from DB when needed
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
      user: {
        id: user.id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        avatar: user.avatar,
      },
    };
  }

  async refresh(userId: number) {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user || user.disabled) {
      throw new UnauthorizedException('User not found or disabled');
    }

    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }
}
