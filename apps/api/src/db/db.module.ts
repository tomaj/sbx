import { Global, Module, Logger } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { ENV } from '../config/config.module';
import { Env } from '../config/env.schema';

export const DB = Symbol('DB');
export type DbType = ReturnType<typeof drizzle<typeof schema>>;

@Global()
@Module({
  providers: [
    {
      provide: DB,
      inject: [ENV],
      useFactory: (env: Env) => {
        const logger = new Logger('DbModule');
        const pool = new Pool({
          connectionString: env.DATABASE_URL,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        });

        pool.on('error', (err) => {
          logger.error('Unexpected pool error', err.stack);
        });

        pool.on('connect', () => {
          logger.debug('New database connection established');
        });

        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DB],
})
export class DbModule {}
