import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Guards /auth/refresh using the dedicated refresh-token strategy. */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
