import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** The authenticated principal shape attached by JwtStrategy.validate(). */
export interface AuthenticatedUser {
  uuid: string;
  email: string;
  role: string;
}

/** Injects the authenticated user (or one of its fields) into a handler. */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;
    return field ? user?.[field] : user;
  },
);
