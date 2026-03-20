import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AssetModule } from './asset/asset.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AssetModule,
  ],
})
export class AppModule {}
