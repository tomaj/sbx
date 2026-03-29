import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import type { EmailJobData } from '@sbx/jobs';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'localhost',
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth:
      process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });

  async send(data: EmailJobData) {
    const { subject, html } = this.render(data);
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM ?? 'noreply@sbx.internal',
      to: data.to,
      subject,
      html,
    });
    this.logger.log(`Email sent [${data.type}] → ${data.to}`);
  }

  private render(data: EmailJobData): { subject: string; html: string } {
    switch (data.type) {
      case 'invitation':
        return {
          subject: `You've been invited to ${data.spaceName}`,
          html: `
            <p>Hi,</p>
            <p><strong>${data.inviterName}</strong> has invited you to collaborate on <strong>${data.spaceName}</strong>.</p>
            <p><a href="${data.inviteUrl}">Accept invitation</a></p>
          `,
        };

      case 'comment-notification':
        return {
          subject: `New comment on "${data.storyName}"`,
          html: `
            <p><strong>${data.commentAuthor}</strong> commented on <a href="${data.storyUrl}">${data.storyName}</a>:</p>
            <blockquote>${data.commentText}</blockquote>
          `,
        };

      case 'approval-request':
        return {
          subject: `Approval requested for "${data.storyName}"`,
          html: `
            <p><strong>${data.requesterName}</strong> is requesting your approval for <a href="${data.storyUrl}">${data.storyName}</a>.</p>
          `,
        };

      case 'approval-resolved':
        return {
          subject: `"${data.storyName}" was ${data.status}`,
          html: `
            <p><strong>${data.resolverName}</strong> has ${data.status} <a href="${data.storyUrl}">${data.storyName}</a>.</p>
          `,
        };

      case 'workflow-stage-changed':
        return {
          subject: `"${data.storyName}" moved to ${data.stageName}`,
          html: `
            <p><strong>${data.actorName}</strong> moved <a href="${data.storyUrl}">${data.storyName}</a> to stage <strong>${data.stageName}</strong>.</p>
          `,
        };

      case 'release-notification':
        return {
          subject: `Release "${data.releaseName}" scheduled`,
          html: `
            <p>Release <strong>${data.releaseName}</strong> is scheduled for <strong>${data.releaseAt}</strong>.</p>
          `,
        };
    }
  }
}
