import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { EmailJobData } from '@sbx/jobs';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'localhost',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
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
          subject: `You've been invited to ${escapeHtml(data.spaceName)}`,
          html: `
            <p>Hi,</p>
            <p><strong>${escapeHtml(data.inviterName)}</strong> has invited you to collaborate on <strong>${escapeHtml(data.spaceName)}</strong>.</p>
            <p><a href="${escapeHtml(data.inviteUrl)}">Accept invitation</a></p>
          `,
        };

      case 'comment-notification':
        return {
          subject: `New comment on "${escapeHtml(data.storyName)}"`,
          html: `
            <p><strong>${escapeHtml(data.commentAuthor)}</strong> commented on <a href="${escapeHtml(data.storyUrl)}">${escapeHtml(data.storyName)}</a>:</p>
            <blockquote>${escapeHtml(data.commentText)}</blockquote>
          `,
        };

      case 'approval-request':
        return {
          subject: `Approval requested for "${escapeHtml(data.storyName)}"`,
          html: `
            <p><strong>${escapeHtml(data.requesterName)}</strong> is requesting your approval for <a href="${escapeHtml(data.storyUrl)}">${escapeHtml(data.storyName)}</a>.</p>
          `,
        };

      case 'approval-resolved':
        return {
          subject: `"${escapeHtml(data.storyName)}" was ${escapeHtml(data.status)}`,
          html: `
            <p><strong>${escapeHtml(data.resolverName)}</strong> has ${escapeHtml(data.status)} <a href="${escapeHtml(data.storyUrl)}">${escapeHtml(data.storyName)}</a>.</p>
          `,
        };

      case 'workflow-stage-changed':
        return {
          subject: `"${escapeHtml(data.storyName)}" moved to ${escapeHtml(data.stageName)}`,
          html: `
            <p><strong>${escapeHtml(data.actorName)}</strong> moved <a href="${escapeHtml(data.storyUrl)}">${escapeHtml(data.storyName)}</a> to stage <strong>${escapeHtml(data.stageName)}</strong>.</p>
          `,
        };

      case 'release-notification':
        return {
          subject: `Release "${escapeHtml(data.releaseName)}" scheduled`,
          html: `
            <p>Release <strong>${escapeHtml(data.releaseName)}</strong> is scheduled for <strong>${escapeHtml(data.releaseAt)}</strong>.</p>
          `,
        };
    }
  }
}
