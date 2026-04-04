import { Global, Module, Logger } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DB = Symbol('DB');
export type DbType = ReturnType<typeof drizzle<typeof schema>>;

@Global()
@Module({
  providers: [
    {
      provide: DB,
      useFactory: () => {
        const logger = new Logger('DbModule');
        const pool = new Pool({
          connectionString:
            process.env.DATABASE_URL ??
            'postgresql://tomaj@localhost:5432/sbx',
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
