import { Global, Module, type FactoryProvider } from '@nestjs/common';
import { JobsClient } from '@sbx/jobs';

export const JOBS_CLIENT = Symbol('JOBS_CLIENT');

const jobsClientProvider: FactoryProvider<JobsClient> = {
  provide: JOBS_CLIENT,
  useFactory: () =>
    new JobsClient({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
    }),
};

@Global()
@Module({
  providers: [jobsClientProvider],
  exports: [JOBS_CLIENT],
})
export class JobsModule {}
