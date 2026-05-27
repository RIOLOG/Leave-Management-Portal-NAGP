require('colors');
const Consul = require('consul');

const registerWithConsul = async () => {
  try {
    const consul = new Consul({
      host: process.env.CONSUL_HOST || 'localhost',
      port: parseInt(process.env.CONSUL_PORT) || 8500,
      promisify: true
    });

    const serviceName = process.env.SERVICE_NAME || 'employee-service';
    const servicePort = parseInt(process.env.PORT) || 3002;

    const serviceConfig = {
      name: serviceName,
      address: 'localhost',
      port: servicePort,
      check: {
        ttl: '30s',
        deregistercriticalserviceafter: '1m'
      }
    };

    await consul.agent.service.register(serviceConfig);
    console.log(`Registered with Consul: ${serviceName}`.green);

    // TTL heartbeat every 15 seconds
    setInterval(async () => {
      try {
        await consul.agent.check.pass(`service:${serviceName}`);
      } catch (err) {
        // silently ignore
      }
    }, 15000);

    // First heartbeat immediately
    setTimeout(async () => {
      try {
        await consul.agent.check.pass(`service:${serviceName}`);
        console.log(` Consul TTL heartbeat started`.green);
      } catch (err) {
        // silently ignore
      }
    }, 1000);

  } catch (error) {
    console.error(' Consul registration failed:', error.message.red);
  }
};

// ─── Lookup Service via Consul ─────────────────────────
const lookupService = async (serviceName) => {
  try {
    const consul = require('node-consul')({
      host: process.env.CONSUL_HOST || 'localhost',
      port: parseInt(process.env.CONSUL_PORT) || 8500,
      promisify: true
    });

    const services = await consul.catalog.service.nodes(serviceName);

    if (!services || services.length === 0) {
      throw new Error(`Service ${serviceName} not found in Consul`);
    }

    const service = services[0];
    return {
      host: service.ServiceAddress || 'localhost',
      port: service.ServicePort
    };

  } catch (error) {
    console.error(`Consul lookup failed for ${serviceName}:`, error.message.red);
    return null;
  }
};

module.exports = { registerWithConsul, lookupService };