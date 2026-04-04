import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

let sdk: NodeSDK | undefined;

export function initTelemetry() {
  if (process.env.OTEL_ENABLED !== 'true') return;

  const prometheusExporter = new PrometheusExporter({
    port: parseInt(process.env.METRICS_PORT ?? '9464', 10),
  });

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'sbx-api',
    }),
    metricReader: prometheusExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': { enabled: true },
        '@opentelemetry/instrumentation-express': { enabled: true },
        '@opentelemetry/instrumentation-pg': { enabled: true },
      }),
    ],
  });

  sdk.start();
}

export function shutdownTelemetry(): Promise<void> {
  return sdk?.shutdown() ?? Promise.resolve();
}
