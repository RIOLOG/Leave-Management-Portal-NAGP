require('colors');
const Consul = require('consul');

const registerWithConsul = async () => {
  try {
     const consul = new Consul({
      host: process.env.CONSUL_HOST || 'localhost',
      port: parseInt(process.env.CONSUL_PORT) || 8500,
      promisify: true
    });

    const serviceName = process.env.SERVICE_NAME || 'leave-service';
    const servicePort = parseInt(process.env.PORT) || 3003;

    await consul.agent.service.register({
      name: serviceName,
      address: 'localhost',
      port: servicePort,
      check: {
        ttl: '30s',
        deregistercriticalserviceafter: '1m'
      }
    });

    console.log(` Registered with Consul: ${serviceName}`.green);

    setInterval(async () => {
      try {
        await consul.agent.check.pass(`service:${serviceName}`);
      } catch (err) {}
    }, 15000);

    setTimeout(async () => {
      try {
        await consul.agent.check.pass(`service:${serviceName}`);
        console.log(` Consul TTL heartbeat started`.green);
      } catch (err) {}
    }, 1000);

  } catch (error) {
    console.error(' Consul registration failed:'.red, error.message);
  }
};

module.exports = registerWithConsul;