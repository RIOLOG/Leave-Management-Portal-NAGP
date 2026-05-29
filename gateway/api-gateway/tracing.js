require('colors');

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');


const jaegerExporter = new JaegerExporter({
  endpoint: process.env.JAEGER_ENDPOINT
    || 'http://localhost:14268/api/traces'
});

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
  [SemanticResourceAttributes.SERVICE_NAME]: 'api-gateway',
  environment: 'development'
}),
  traceExporter: jaegerExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true }
    })
  ]
});

sdk.start();
console.log('Tracing initialized for api-gateway'.bgMagenta);

process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});

module.exports = sdk;