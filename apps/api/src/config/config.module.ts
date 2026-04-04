import { Global, Module } from '@nestjs/common';
import { validateEnv, type Env } from './env.schema';

export const ENV = Symbol('ENV');

@Global()
@Module({
  providers: [
    {
      provide: ENV,
      useFactory: (): Env => validateEnv(),
    },
  ],
  exports: [ENV],
})
export class ConfigModule {}
