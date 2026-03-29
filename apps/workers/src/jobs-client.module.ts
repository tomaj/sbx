import { Global, Module } from '@nestjs/common';
import { jobsClientProvider, JOBS_CLIENT } from './jobs.provider.js';

@Global()
@Module({
  providers: [jobsClientProvider],
  exports: [JOBS_CLIENT],
})
export class JobsClientModule {}
