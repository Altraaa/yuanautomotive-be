import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './strategies/jwt.strategy';

/** Public shape of a user in API responses ({ id, email, name, role }). */
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const tokens = await this.issueTokens(user);
    await this.persistRefreshHash(user.uuid, tokens.refresh_token);
    return { ...tokens, user: this.toResponse(user) };
  }

  async refresh(uuid: string, presentedRefreshToken: string) {
    const user = await this.users.findByUuid(uuid);
    if (!user || !user.refresh_token_hash) {
      throw new UnauthorizedException('Access denied');
    }
    const valid = await bcrypt.compare(
      presentedRefreshToken,
      user.refresh_token_hash,
    );
    if (!valid) throw new UnauthorizedException('Access denied');

    const access_token = await this.signAccess(user);
    return { access_token };
  }

  async logout(uuid: string): Promise<void> {
    await this.users.setRefreshTokenHash(uuid, null);
  }

  async me(uuid: string): Promise<UserResponse> {
    const user = await this.users.getByUuidOrFail(uuid);
    return this.toResponse(user);
  }

  // ── helpers ───────────────────────────────────────
  private async issueTokens(user: User) {
    const [access_token, refresh_token] = await Promise.all([
      this.signAccess(user),
      this.signRefresh(user),
    ]);
    return { access_token, refresh_token };
  }

  private signAccess(user: User): Promise<string> {
    return this.jwt.signAsync(this.payload(user), {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<string>('jwt.accessTtl'),
    });
  }

  private signRefresh(user: User): Promise<string> {
    return this.jwt.signAsync(this.payload(user), {
      secret: this.config.get<string>('jwt.refreshSecret'),
      expiresIn: this.config.get<string>('jwt.refreshTtl'),
    });
  }

  private async persistRefreshHash(uuid: string, token: string) {
    const hash = await bcrypt.hash(token, 10);
    await this.users.setRefreshTokenHash(uuid, hash);
  }

  private payload(user: User): JwtPayload {
    return { sub: user.uuid, email: user.email, role: user.role };
  }

  private toResponse(user: User): UserResponse {
    return {
      id: user.uuid,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }
}
