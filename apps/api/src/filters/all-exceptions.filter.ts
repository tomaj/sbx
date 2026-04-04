import {
  type ExceptionFilter,
  Catch,
  type ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    const correlationId = (request.headers['x-request-id'] as string) ?? 'unknown';

    // Log server errors
    if (status >= 500) {
      this.logger.error(
        {
          correlationId,
          method: request.method,
          url: request.url,
          status,
          error: exception instanceof Error ? exception.stack : String(exception),
        },
        `Unhandled exception`,
      );
    }

    const body =
      typeof message === 'object'
        ? { ...message, correlationId }
        : { statusCode: status, message, correlationId };

    response.status(status).json(body);
  }
}
