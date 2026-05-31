require('colors')

const winston = require('winston');
const net = require('net');

class TCPTransport extends winston.Transport {
  constructor(opts) {
    super(opts);
    this.host = opts.host || 'localhost';
    this.port = opts.port || 5000;
    this.client = null;
    this.connected = false;
    this.buffer = [];
    this.connect();
  }

  connect() {
    this.client = new net.Socket();
    this.client.connect(this.port, this.host, () => {
      this.connected = true;
      console.log(`Logger connected to Logstash at ${this.host}:${this.port}`.bgCyan);
      while (this.buffer.length > 0) {
        this.client.write(this.buffer.shift());
      }
    });
    this.client.on('error', () => { this.connected = false; });
    this.client.on('close', () => {
      this.connected = false;
      setTimeout(() => this.connect(), 5000);
    });
  }

  log(info, callback) {
    setImmediate(() => this.emit('logged', info));
    const logLine = JSON.stringify(info) + '\n';
    if (this.connected && this.client && !this.client.destroyed) {
      this.client.write(logLine);
    } else {
      this.buffer.push(logLine);
    }
    callback();
  }
}

const loggers = {};

const createLogger = (serviceName) => {
  // Return existing logger if already created
  if (loggers[serviceName]) {
    return loggers[serviceName];
  }

  // Create new logger only once per service
  loggers[serviceName] = winston.createLogger({
    defaultMeta: { service: serviceName },
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(
            ({ level, message, service, timestamp, ...meta }) => {
              const metaStr = Object.keys(meta).length
                ? ' ' + JSON.stringify(meta) : '';
              return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
            }
          )
        )
      }),
      new TCPTransport({
        host: process.env.LOGSTASH_HOST || 'localhost',
        port: parseInt(process.env.LOGSTASH_PORT) || 5000
      })
    ]
  });

  return loggers[serviceName];
};

module.exports = { createLogger };