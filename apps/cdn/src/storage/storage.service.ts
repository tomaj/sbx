import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  GetObjectCommand,
  NoSuchKey,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly config: ConfigService) {
    this.s3 = new S3Client({
      endpoint: config.getOrThrow<string>('MINIO_ENDPOINT'),
      region: config.get<string>('MINIO_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: config.getOrThrow<string>('MINIO_ACCESS_KEY'),
        secretAccessKey: config.getOrThrow<string>('MINIO_SECRET_KEY'),
      },
      forcePathStyle: true, // required for MinIO
    });

    this.bucket = config.getOrThrow<string>('MINIO_BUCKET');
  }

  /**
   * Fetches an object from MinIO and returns its content as a Buffer.
   * @param key  Object key, e.g. '285923/path/to/image.jpg'
   */
  async getObject(key: string): Promise<Buffer> {
    this.logger.debug(`Fetching object: ${this.bucket}/${key}`);

    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });

    try {
      const response = await this.s3.send(command);
      return streamToBuffer(response.Body as Readable);
    } catch (err) {
      if (err instanceof NoSuchKey) {
        throw new NotFoundException(`Asset not found: ${key}`);
      }
      throw err;
    }
  }
}

function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
