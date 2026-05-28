require('colors');
const Consul = require('consul');

const getServiceUrl = async (serviceName) => {
  try {
    const consul = new Consul({
      host: process.env.CONSUL_HOST || 'localhost',
      port: parseInt(process.env.CONSUL_PORT) || 8500,
      promisify: true
    });

    const services = await consul.catalog.service.nodes(serviceName);

    if (!services || services.length === 0) {
      throw new Error(`${serviceName} not found in Consul`);
    }

    const service = services[0];
    const host = service.ServiceAddress || 'localhost';
    const port = service.ServicePort;

    return `http://${host}:${port}`;

  } catch (error) {
    console.error(`Consul lookup failed for ${serviceName}:`, error.message.red);

    // Fallback to .env URLs
    const fallbacks = {
      'auth-service':     process.env.AUTH_SERVICE_URL,
      'employee-service': process.env.EMPLOYEE_SERVICE_URL,
      'leave-service':    process.env.LEAVE_SERVICE_URL
    };

    const fallback = fallbacks[serviceName];
    if (fallback) {
      console.log(` Using fallback URL for ${serviceName}: ${fallback}`.yellow);
      return fallback;
    }

    throw new Error(`No URL available for ${serviceName}`);
  }
};

module.exports = { getServiceUrl };