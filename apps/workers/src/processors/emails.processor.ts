import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { EMAILS_QUEUE } from '@sbx/jobs';
import { EmailJobData } from '@sbx/jobs';
import { EmailService } from '../email/email.service.js';

@Processor(EMAILS_QUEUE, { concurrency: 5 })
export class EmailsProcessor extends WorkerHost {
  constructor(@Inject(EmailService) private emailService: EmailService) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    await this.emailService.send(job.data);
  }
}
