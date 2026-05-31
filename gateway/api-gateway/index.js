require('./tracing');   
require('dotenv').config();
require('colors'); 


const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { authenticate } = require('./middleware/auth');   // gateway-specific: handles PUBLIC_ROUTES
const rateLimiter = require('./middleware/rateLimiter');
const ROUTES = require('./config/routes');

const errorHandler = require('../../shared/middleware/errorHandler');
const { getServiceUrl } = require('../../shared/config/consul');

const app = express();
const PORT = process.env.PORT || 3004;



// ─── Health Check ──────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});


// ─── Rate Limiting ────────────────────────────────────
app.use(rateLimiter);


// ─── JWT Authentication ───────────────────────────────
app.use(authenticate);


// ─── Dynamic Routing via Consul ───────────────────────
ROUTES.forEach(({ prefix, serviceName, targetPrefix }) => {
  app.use(prefix, async (req, res, next) => {
    try {
      // Step 1 — get service URL from Consul
      const serviceUrl = await getServiceUrl(serviceName);
      console.log("API Gateway service URL", serviceUrl.green);

      console.log(`Routing ${prefix} → ${serviceUrl}${targetPrefix}`.yellow);

      // Step 2 — create proxy and forward
      createProxyMiddleware({
        target: serviceUrl,
        changeOrigin: true,
        pathRewrite: (path, req) => {
          // Strip /api/leaves → /leaves
          const newPath = req.originalUrl.replace(prefix, targetPrefix);
          console.log(`   Path: ${req.originalUrl} → ${newPath}`.yellow);
          return newPath;
        },
        on: {
          error: (err, req, res) => {
            console.error(`Proxy error for ${serviceName}:`, err.message.red);
            res.status(502).json({
              success: false,
              message: `${serviceName} is currently unavailable`
            });
          }
        }
      })(req, res, next);

    } catch (error) {
      console.error(` Routing error:`, error.message.red);
      res.status(503).json({
        success: false,
        message: `Cannot route to ${serviceName} — service unavailable`
      });
    }
  });
});


// ─── 404 Handler ──────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`
  });
});


// ─── Global Error Handler ─────────────────────────────
app.use(errorHandler);


// ─── Start Server ─────────────────────────────────────
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`.green);
  console.log(`Routes configured:`.yellow);
  ROUTES.forEach(r => {
    console.log(`    ${r.prefix} → ${r.serviceName}`.yellow);
  });
});

