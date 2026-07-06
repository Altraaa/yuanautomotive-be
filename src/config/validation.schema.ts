import * as Joi from 'joi';

/**
 * Joi env validation schema. The app refuses to boot with an invalid env,
 * so misconfiguration fails fast instead of at runtime.
 */
export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  APP_PORT: Joi.number().default(3001),
  APP_NAME: Joi.string().default('yuan-automotive-backend'),
  GLOBAL_PREFIX: Joi.string().allow('').default(''),
  CORS_ORIGINS: Joi.string().required(),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  DB_DATABASE: Joi.string().required(),
  DB_CONNECTION_LIMIT: Joi.number().default(10),

  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_TTL: Joi.string().default('7d'),

  MEDIA_STORAGE: Joi.string()
    .valid('local', 's3', 'cloudinary')
    .default('local'),
  MEDIA_UPLOAD_DIR: Joi.string().default('./uploads'),
  MEDIA_PUBLIC_BASE: Joi.string().allow('').default(''),
  MEDIA_MAX_SIZE_MB: Joi.number().default(10),

  // Required only when MEDIA_STORAGE=cloudinary; ignored otherwise.
  CLOUDINARY_CLOUD_NAME: Joi.string().when('MEDIA_STORAGE', {
    is: 'cloudinary',
    then: Joi.required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  CLOUDINARY_API_KEY: Joi.string().when('MEDIA_STORAGE', {
    is: 'cloudinary',
    then: Joi.required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  CLOUDINARY_API_SECRET: Joi.string().when('MEDIA_STORAGE', {
    is: 'cloudinary',
    then: Joi.required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  CLOUDINARY_FOLDER: Joi.string().allow('').default('yuan-automotive'),

  FRONTEND_URL: Joi.string().uri().required(),
  REVALIDATE_SECRET: Joi.string().required(),
  REVALIDATE_TIMEOUT_MS: Joi.number().default(3000),

  WA_ENABLED: Joi.boolean().truthy('true').falsy('false').default(false),
  WA_API_URL: Joi.string().allow('').default(''),
  WA_API_TOKEN: Joi.string().allow('').default(''),
  WA_ADMIN_NUMBER: Joi.string().allow('').default(''),

  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(120),
  THROTTLE_PUBLIC_LIMIT: Joi.number().default(10),

  SEED_ADMIN_EMAIL: Joi.string().email().optional(),
  SEED_ADMIN_PASSWORD: Joi.string().optional(),
  SEED_ADMIN_NAME: Joi.string().optional(),
});
