import * as dotenv from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

// DataSource file loads env itself so the TypeORM CLI works standalone.
dotenv.config();

/**
 * Single source of DB config shared by the Nest app and the TypeORM CLI.
 * synchronize is FALSE in every environment (CLAUDE.md §3) — migrations only.
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? 'yuan_automotive',
  charset: 'utf8mb4',
  timezone: 'Z',
  synchronize: false,
  migrationsRun: false,
  logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  extra: {
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),
  },
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
