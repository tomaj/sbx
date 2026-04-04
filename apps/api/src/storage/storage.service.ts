import { Injectable, Inject } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { ENV } from '../config/config.module';
import { Env } from '../config/env.schema';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(@Inject(ENV) env: Env) {
    this.s3 = new S3Client({
      endpoint: env.MINIO_ENDPOINT,
      region: env.MINIO_REGION,
      credentials: {
        accessKeyId: env.MINIO_ACCESS_KEY,
        secretAccessKey: env.MINIO_SECRET_KEY,
      },
      forcePathStyle: true,
    });
    this.bucket = env.MINIO_BUCKET;
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async deleteObject(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async getObject(key: string): Promise<{ body: Buffer; contentType: string } | null> {
    try {
      const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      const stream = res.Body as NodeJS.ReadableStream;
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      return {
        body: Buffer.concat(chunks),
        contentType: res.ContentType ?? 'application/octet-stream',
      };
    } catch {
      return null;
    }
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }
}
