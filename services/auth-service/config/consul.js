require('colors');
const Consul = require('consul');

const registerWithConsul = async () => {
  try {
    const consul = new Consul({
      host: process.env.CONSUL_HOST || 'consul',
      port: parseInt(process.env.CONSUL_PORT) || 8500
    });

    // SERVICE_HOST = your Windows IP (reachable from Docker)
    const serviceHost = process.env.SERVICE_HOST || 'localhost';
    const servicePort = parseInt(process.env.PORT) || 3001

    const serviceConfig = {
      name: process.env.SERVICE_NAME || 'auth-service',
      address: serviceHost,
      port: servicePort,
      // check: {
      //   http: `http://${serviceHost}:${servicePort}/health`,
      //   interval: '10s',
      //   timeout: '5s',
      //   deregistercriticalserviceafter: '30s'
      // }
      check: {
        ttl: '30s',   // we send heartbeat every 15s, TTL is 30s
        deregistercriticalserviceafter: '1m'
      }
    };

    await consul.agent.service.register(serviceConfig);

    console.log(`Registered with Consul: ${serviceConfig.name}`.yellow);
    console.log(`Health check: ${serviceConfig.check.http}`.yellow);

    // Send TTL heartbeat every 15 seconds
    // This is like our custom heartbeat from POC!
    setInterval(async () => {
      try {
        await consul.agent.check.pass(`service:${serviceName}`);
      } catch (err) {
        // silently ignore
      }
    }, 15000);

    // Send first heartbeat immediately
    setTimeout(async () => {
      try {
        await consul.agent.check.pass(`service:${serviceName}`);
        console.log(`Consul TTL heartbeat started`.bgRed);
      } catch (err) {
        // silently ignore
      }
    }, 1000);


  } catch (error) {
    console.error('Consul registration failed:', error.message.red);
  }
};

module.exports = registerWithConsul;
