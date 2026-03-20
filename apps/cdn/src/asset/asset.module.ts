import { Module } from '@nestjs/common';
import { AssetController } from './asset.controller';
import { AssetService } from './asset.service';
import { StorageModule } from '../storage/storage.module';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [StorageModule, CacheModule],
  controllers: [AssetController],
  providers: [AssetService],
})
export class AssetModule {}
