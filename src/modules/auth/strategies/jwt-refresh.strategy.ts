import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JwtPayload } from './jwt.strategy';

export interface RefreshRequestUser extends JwtPayload {
  refreshToken: string;
}

/**
 * Validates the longer-lived REFRESH token, read from the request body
 * ({ refresh_token }). The raw token is forwarded so the service can compare
 * it against the stored hash (rotation).
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refresh_token'),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.refreshSecret') as string,
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload): RefreshRequestUser {
    const refreshToken = (req.body as { refresh_token?: string })
      ?.refresh_token;
    if (!refreshToken || !payload?.sub) throw new UnauthorizedException();
    return { ...payload, refreshToken };
  }
}
