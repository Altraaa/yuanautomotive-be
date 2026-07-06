import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationChannel,
  NotificationEvent,
  NotificationStatus,
} from '../../common/enums';
import { Notification } from './entities/notification.entity';

export interface DispatchInput {
  event: NotificationEvent;
  message: string;
  relatedUuid?: string;
  /** Override recipient; defaults to the configured admin number. */
  target?: string;
}

/**
 * WhatsApp notifications (CLAUDE.md 🔔). Flow is: DB write happens in the caller,
 * then dispatch() sends WA and logs the result. Fully non-blocking and swallows
 * all errors — a failed notification must NEVER fail the primary write.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    private readonly config: ConfigService,
  ) {}

  /** Fire-and-forget entry point used by contacts/orders after their DB commit. */
  dispatch(input: DispatchInput): void {
    setImmediate(() => {
      void this.sendAndLog(input);
    });
  }

  private async sendAndLog(input: DispatchInput): Promise<void> {
    const enabled = this.config.get<boolean>('whatsapp.enabled');
    const target =
      input.target ?? this.config.get<string>('whatsapp.adminNumber') ?? null;

    let status: NotificationStatus = NotificationStatus.SKIPPED;
    let error: string | null = null;

    try {
      if (!enabled) {
        status = NotificationStatus.SKIPPED;
      } else {
        await this.sendWhatsApp(target, input.message);
        status = NotificationStatus.SENT;
      }
    } catch (err) {
      status = NotificationStatus.FAILED;
      error = (err as Error).message;
      this.logger.warn(
        `WhatsApp dispatch failed (${input.event}): ${error}`,
      );
    }

    try {
      await this.repo.save(
        this.repo.create({
          channel: NotificationChannel.WHATSAPP,
          event: input.event,
          status,
          target,
          message: input.message,
          related_uuid: input.relatedUuid ?? null,
          error,
        }),
      );
    } catch (logErr) {
      this.logger.error(
        `Failed to persist notification log: ${(logErr as Error).message}`,
      );
    }
  }

  private async sendWhatsApp(
    target: string | null,
    message: string,
  ): Promise<void> {
    const apiUrl = this.config.get<string>('whatsapp.apiUrl');
    const apiToken = this.config.get<string>('whatsapp.apiToken');
    if (!apiUrl || !target) {
      throw new Error('WhatsApp not configured (apiUrl/target missing)');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
        },
        body: JSON.stringify({ to: target, message }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`WA provider HTTP ${res.status}`);
    } finally {
      clearTimeout(timer);
    }
  }
}
