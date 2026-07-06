import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Fires the FE on-demand ISR webhook after admin writes (CLAUDE.md §1,
 * BACKEND-GUIDE §7):
 *   POST {FRONTEND_URL}/api/revalidate?tag=<tag>&secret=<REVALIDATE_SECRET>
 *
 * Fire-and-forget: wrapped in try/catch with a short timeout, and NEVER
 * allowed to fail the originating write response.
 */
@Injectable()
export class RevalidateService {
  private readonly logger = new Logger(RevalidateService.name);

  constructor(private readonly config: ConfigService) {}

  /** Non-blocking: schedules the call and returns immediately. */
  trigger(tag: string): void {
    void this.send(tag);
  }

  private async send(tag: string): Promise<void> {
    const frontendUrl = this.config.get<string>('revalidate.frontendUrl');
    const secret = this.config.get<string>('revalidate.secret');
    const timeoutMs =
      this.config.get<number>('revalidate.timeoutMs') ?? 3000;

    if (!frontendUrl || !secret) {
      this.logger.warn('Revalidate skipped: FRONTEND_URL or secret missing');
      return;
    }

    const url = `${frontendUrl.replace(/\/$/, '')}/api/revalidate?tag=${encodeURIComponent(
      tag,
    )}&secret=${encodeURIComponent(secret)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
      });
      if (!res.ok) {
        this.logger.warn(`Revalidate tag=${tag} → HTTP ${res.status}`);
      } else {
        this.logger.debug(`Revalidate tag=${tag} ok`);
      }
    } catch (err) {
      this.logger.warn(
        `Revalidate tag=${tag} failed: ${(err as Error).message}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
