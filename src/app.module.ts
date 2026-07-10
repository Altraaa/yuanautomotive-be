import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { CommonModule } from './common/common.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { dataSourceOptions } from './database/data-source';
import { AuthModule } from './modules/auth/auth.module';
import { BlogModule } from './modules/blog/blog.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CmsModule } from './modules/cms/cms.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';
import { MediaModule } from './modules/media/media.module';
import { NewsModule } from './modules/news/news.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProductsModule } from './modules/products/products.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: { abortEarly: false },
    }),

    // Structured JSON logging with per-request correlation id (CLAUDE.md §12).
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get('env') === 'production' ? 'info' : 'debug',
          transport:
            config.get('env') === 'production'
              ? undefined
              : { target: 'pino-pretty', options: { singleLine: true } },
          autoLogging: true,
          redact: ['req.headers.authorization'],
        },
      }),
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: () => ({
        ...dataSourceOptions,
        autoLoadEntities: true,
      }),
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: (config.get<number>('throttle.ttl') ?? 60) * 1000,
            limit: config.get<number>('throttle.limit') ?? 120,
          },
        ],
      }),
    }),

    CommonModule,

    // Domain modules
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    BlogModule,
    NewsModule,
    ContactsModule,
    OrdersModule,
    MediaModule,
    CmsModule,
    NotificationsModule,
    DashboardModule,
    HealthModule,
  ],
  providers: [
    // Global auth: every route protected unless marked @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Global rate limiting.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Consistent error envelope (NestJS shape the FE parses).
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
