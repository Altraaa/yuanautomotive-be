import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Populates `request.user` when a valid Bearer token is present, but NEVER
 * rejects anonymous requests. Used on routes that serve both public and admin
 * shapes from the same path (e.g. `GET /products`). Pair with `@Public()` so the
 * global JwtAuthGuard doesn't force authentication first.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch {
      // ignore — anonymous access is allowed
    }
    return true;
  }

  handleRequest<TUser>(_err: unknown, user: TUser): TUser {
    // Swallow errors and missing users; return whatever the strategy resolved.
    return (user ?? null) as TUser;
  }
}
