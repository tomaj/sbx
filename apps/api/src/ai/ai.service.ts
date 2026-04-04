import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AiConfigurationRecord, AiBrandingRule } from './ai.types';
import { AiLogsService } from './ai-logs.service';

interface AiResult {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly aiLogs: AiLogsService) {}

  async generateAltText(
    config: AiConfigurationRecord,
    branding: AiBrandingRule | null | undefined,
    imageData: Buffer,
    mimeType: string,
    spaceId?: number,
  ): Promise<string> {
    const base64Image = imageData.toString('base64');
    const prompt = this.buildAltTextPrompt(branding);
    const startedAt = Date.now();

    this.logger.log({
      msg: 'Generating alt text',
      provider: config.provider_name,
      model: config.model_identifier,
      mimeType,
      imageSize: imageData.length,
    });

    try {
      let result: AiResult;

      switch (config.provider_name) {
        case 'openai':
          result = await this.generateWithOpenAi(config, base64Image, mimeType, prompt);
          break;
        case 'anthropic':
          result = await this.generateWithAnthropic(config, base64Image, mimeType, prompt);
          break;
        case 'anthropic_bedrock':
          result = await this.generateWithBedrock(config, base64Image, mimeType, prompt);
          break;
        case 'gemini':
          result = await this.generateWithGemini(config, base64Image, mimeType, prompt);
          break;
        default:
          throw new BadRequestException(`Unsupported AI provider: ${config.provider_name}`);
      }

      const durationMs = Date.now() - startedAt;
      this.logger.log({ msg: 'Alt text generated', provider: config.provider_name, altText: result.text.slice(0, 100), durationMs });

      if (spaceId) {
        this.aiLogs.log({
          spaceId,
          operation: 'asset_alt_text',
          providerName: config.provider_name,
          modelIdentifier: config.model_identifier,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          totalTokens: result.totalTokens,
          status: 'success',
          durationMs,
        }).catch(() => {});
      }

      return result.text;
    } catch (err: any) {
      const durationMs = Date.now() - startedAt;
      this.logger.error({ msg: 'Alt text generation failed', provider: config.provider_name, error: err.message });

      if (spaceId) {
        this.aiLogs.log({
          spaceId,
          operation: 'asset_alt_text',
          providerName: config.provider_name,
          modelIdentifier: config.model_identifier,
          status: 'error',
          errorMessage: err.message,
          durationMs,
        }).catch(() => {});
      }

      throw err;
    }
  }

  private buildAltTextPrompt(branding?: AiBrandingRule | null): string {
    const lines: string[] = [
      'Generate a concise, descriptive alt text for this image. The alt text should be 1-2 sentences, suitable for screen readers and SEO.',
      'Return only the alt text, nothing else.',
    ];

    if (branding) {
      const contextParts: string[] = [];
      if (branding.industry_niche) contextParts.push(`Industry: ${branding.industry_niche}`);
      if (branding.target_audience) contextParts.push(`Target audience: ${branding.target_audience}`);
      if (branding.tone_guidelines) contextParts.push(`Tone: ${branding.tone_guidelines}`);
      if (branding.writing_style) contextParts.push(`Writing style: ${branding.writing_style}`);
      if (branding.avoid_use) contextParts.push(`Avoid using: ${branding.avoid_use}`);
      if (branding.never_use) contextParts.push(`Never use: ${branding.never_use}`);
      if (branding.additional_guidelines) contextParts.push(`Additional context:\n${branding.additional_guidelines}`);

      if (contextParts.length > 0) {
        lines.push('\nBrand context:');
        lines.push(...contextParts);
      }
    }

    return lines.join('\n');
  }

  private async generateWithOpenAi(
    config: AiConfigurationRecord,
    base64Image: string,
    mimeType: string,
    prompt: string,
  ): Promise<AiResult> {
    if (!config.api_key) throw new BadRequestException('OpenAI API key is required');

    const client = new OpenAI({ apiKey: config.api_key });

    const response = await client.chat.completions.create({
      model: config.model_identifier,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    return {
      text: response.choices[0]?.message?.content?.trim() ?? '',
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens,
      totalTokens: response.usage?.total_tokens,
    };
  }

  private async generateWithAnthropic(
    config: AiConfigurationRecord,
    base64Image: string,
    mimeType: string,
    prompt: string,
  ): Promise<AiResult> {
    if (!config.api_key) throw new BadRequestException('Anthropic API key is required');

    const client = new Anthropic({ apiKey: config.api_key });

    const response = await client.messages.create({
      model: config.model_identifier,
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: base64Image,
              },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    });

    const block = response.content[0];
    return {
      text: block?.type === 'text' ? block.text.trim() : '',
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    };
  }

  private async generateWithBedrock(
    config: AiConfigurationRecord,
    base64Image: string,
    mimeType: string,
    prompt: string,
  ): Promise<AiResult> {
    const awsRegion = config.settings?.aws_region;
    const awsAccessKeyId = config.settings?.aws_access_key_id;
    const awsSecretAccessKey = config.settings?.aws_secret_access_key;

    if (!awsAccessKeyId || !awsSecretAccessKey) {
      throw new BadRequestException('AWS credentials are required for Bedrock');
    }

    const client = new BedrockRuntimeClient({
      region: (awsRegion as string) ?? 'us-east-1',
      credentials: {
        accessKeyId: awsAccessKeyId as string,
        secretAccessKey: awsSecretAccessKey as string,
      },
    });

    const body = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: base64Image },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    });

    const command = new InvokeModelCommand({
      modelId: config.model_identifier,
      body: Buffer.from(body),
      contentType: 'application/json',
      accept: 'application/json',
    });

    const response = await client.send(command);
    const result = JSON.parse(Buffer.from(response.body).toString('utf-8'));
    const block = result?.content?.[0];
    const usage = result?.usage;

    return {
      text: block?.type === 'text' ? block.text.trim() : '',
      inputTokens: usage?.input_tokens,
      outputTokens: usage?.output_tokens,
      totalTokens: usage ? usage.input_tokens + usage.output_tokens : undefined,
    };
  }

  private async generateWithGemini(
    config: AiConfigurationRecord,
    base64Image: string,
    mimeType: string,
    prompt: string,
  ): Promise<AiResult> {
    if (!config.api_key) throw new BadRequestException('Gemini API key is required');

    const genAI = new GoogleGenerativeAI(config.api_key);
    const model = genAI.getGenerativeModel({ model: config.model_identifier });

    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType, data: base64Image } },
    ]);

    const meta = result.response.usageMetadata;
    return {
      text: result.response.text().trim(),
      inputTokens: meta?.promptTokenCount,
      outputTokens: meta?.candidatesTokenCount,
      totalTokens: meta?.totalTokenCount,
    };
  }
}
