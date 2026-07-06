import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Media } from './entities/media.entity';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { CloudinaryStorageDriver } from './storage/cloudinary-storage.driver';
import { LocalStorageDriver } from './storage/local-storage.driver';
import { STORAGE_DRIVER } from './storage/storage.interface';

@Module({
  imports: [TypeOrmModule.forFeature([Media])],
  controllers: [MediaController],
  providers: [
    MediaService,
    // Driver is chosen at boot by MEDIA_STORAGE — nothing else changes.
    {
      provide: STORAGE_DRIVER,
      useFactory: (config: ConfigService) =>
        config.get<string>('media.storage') === 'cloudinary'
          ? new CloudinaryStorageDriver(config)
          : new LocalStorageDriver(config),
      inject: [ConfigService],
    },
  ],
  exports: [MediaService],
})
export class MediaModule {}
