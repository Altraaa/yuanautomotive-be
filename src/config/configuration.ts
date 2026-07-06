/**
 * Typed configuration loader. All values come from env (validated by Joi).
 * No hardcoded hosts / IPs / secrets — CLAUDE.md ⚙️ CONFIGURATION rule.
 */
export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  app: {
    name: process.env.APP_NAME ?? 'yuan-automotive-backend',
    port: Number(process.env.APP_PORT ?? 3001),
    globalPrefix: process.env.GLOBAL_PREFIX ?? '',
    corsOrigins: (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  },
  database: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    username: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_DATABASE ?? 'yuan_automotive',
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET as string,
    refreshSecret: process.env.JWT_REFRESH_SECRET as string,
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },
  media: {
    storage: process.env.MEDIA_STORAGE ?? 'local',
    uploadDir: process.env.MEDIA_UPLOAD_DIR ?? './uploads',
    publicBase: process.env.MEDIA_PUBLIC_BASE ?? '',
    maxSizeMb: Number(process.env.MEDIA_MAX_SIZE_MB ?? 10),
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
      apiKey: process.env.CLOUDINARY_API_KEY ?? '',
      apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
      folder: process.env.CLOUDINARY_FOLDER ?? 'yuan-automotive',
    },
  },
  revalidate: {
    frontendUrl: process.env.FRONTEND_URL ?? '',
    secret: process.env.REVALIDATE_SECRET ?? '',
    timeoutMs: Number(process.env.REVALIDATE_TIMEOUT_MS ?? 3000),
  },
  whatsapp: {
    enabled: process.env.WA_ENABLED === 'true',
    apiUrl: process.env.WA_API_URL ?? '',
    apiToken: process.env.WA_API_TOKEN ?? '',
    adminNumber: process.env.WA_ADMIN_NUMBER ?? '',
  },
  throttle: {
    ttl: Number(process.env.THROTTLE_TTL ?? 60),
    limit: Number(process.env.THROTTLE_LIMIT ?? 120),
    publicLimit: Number(process.env.THROTTLE_PUBLIC_LIMIT ?? 10),
  },
});
