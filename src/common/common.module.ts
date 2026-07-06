import { Global, Module } from '@nestjs/common';
import { RevalidateService } from './services/revalidate.service';

/**
 * Global module for cross-cutting infrastructure services that many domain
 * modules depend on (ISR revalidation, etc.). Marked @Global so they need not
 * be re-imported everywhere.
 */
@Global()
@Module({
  providers: [RevalidateService],
  exports: [RevalidateService],
})
export class CommonModule {}
