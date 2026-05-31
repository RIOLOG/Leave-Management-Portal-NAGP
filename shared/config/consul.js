require('colors');
const Consul = require('consul');

const registerWithConsul = async (serviceName, servicePort) => {
  try {
     const consul = new Consul({
      host: process.env.CONSUL_HOST || 'localhost',
      port: parseInt(process.env.CONSUL_PORT) || 8500,
      promisify: true
    });

    const isDocker = process.env.DOCKER_ENV === 'true';

    const serviceConfig = {
      name: serviceName,
      address: isDocker ? serviceName : 'localhost',
      port: servicePort,
      check: isDocker
        ? {
            http: `http://${serviceName}:${servicePort}/health`,
            interval: '10s',
            timeout: '5s',
            deregistercriticalserviceafter: '30s'
          }
        : {
            ttl: '30s',
            deregistercriticalserviceafter: '1m'
          }
    };

    await consul.agent.service.register(serviceConfig);
    console.log(`Registered with Consul: ${serviceName}`.bgGreen);

    if (!isDocker) {
      setInterval(async () => {
        try {
          await consul.agent.check.pass(`service:${serviceName}`);
        } catch (err) {}
      }, 15000);

      setTimeout(async () => {
        try {
          await consul.agent.check.pass(`service:${serviceName}`);
          console.log('Consul TTL heartbeat started'.bgGreen);
        } catch (err) {}
      }, 1000);
    }

  } catch (error) {
    console.error('Consul registration failed:', error.message.bgRed);
  }
};

const getServiceUrl = async (serviceName) => {
  try {
    const isDocker = process.env.DOCKER_ENV === 'true';

    if (isDocker) {
      // In Docker — use service name directly (no Consul needed)
      // leave-service is load balanced via nginx
      const urls = {
        'auth-service':     'http://auth-service:3001',
        'employee-service': 'http://employee-service:3002',
        'leave-service':    'http://nginx',
        'api-gateway':      'http://api-gateway:3004'
      };
      return urls[serviceName];
    }

    // Local dev — use Consul lookup
    const consul = require('node-consul')({
      host: process.env.CONSUL_HOST || 'localhost',
      port: parseInt(process.env.CONSUL_PORT) || 8500,
      promisify: true
    });

    const services = await consul.catalog.service.nodes(serviceName);

    if (!services || services.length === 0) {
      throw new Error(`${serviceName} not found in Consul`);
    }

    const service = services[0];
    return `http://${service.ServiceAddress || 'localhost'}:${service.ServicePort}`;

  } catch (error) {
    console.error(`Service lookup failed for ${serviceName}:`, error.message.bgRed);

    // Fallback to env vars
    const fallbacks = {
      'auth-service':     process.env.AUTH_SERVICE_URL,
      'employee-service': process.env.EMPLOYEE_SERVICE_URL,
      'leave-service':    process.env.LEAVE_SERVICE_URL
    };

    return fallbacks[serviceName] || null;
  }
};

module.exports = { registerWithConsul, getServiceUrl };


