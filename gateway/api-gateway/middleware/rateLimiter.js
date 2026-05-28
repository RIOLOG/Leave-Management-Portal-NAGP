
// We are using Fixed Window Counter algorithm

// → express-rate-limit uses this by default
// → simple to implement ✅
// → good enough for assignment ✅
// → 100 requests per 60 second window





// const rateLimit = require('express-rate-limit');

// const rateLimiter = rateLimit({
//   windowMs: 60 * 1000,  // 1 minute
//   max: 100,             // 100 requests per minute

//   keyGenerator: (req) => {
//     // Prefer auth token if available
//     if (req.headers['authorization']) {
//       return req.headers['authorization'];
//     }

//     // Otherwise use Express-provided IP safely
//     return req.ip;
//   },

//   handler: (req, res) => {
//     console.log(`Rate limit exceeded for: ${req.headers['authorization']}`.red);
//     res.status(429).json({
//       success: false,
//       message: 'Too many requests — please wait 1 minute'
//     });
//   },
//   skip: (req) => {
//     // Skip rate limiting for health check
//     return req.path === '/health';
//   }
// });

// module.exports = rateLimiter;












const rateLimit = require('express-rate-limit');

const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,

  keyGenerator: (req) => {
    // Use auth token if available
    if (req.headers['authorization']) {
      return req.headers['authorization'];
    }

    // Safe IP handling for IPv4 + IPv6
    return rateLimit.ipKeyGenerator(req.ip);
  },

  handler: (req, res) => {
    console.log(`Rate limit exceeded`.red);

    res.status(429).json({
      success: false,
      message: 'Too many requests — please wait 1 minute'
    });
  },

  skip: (req) => {
    return req.path === '/health';
  }
});

module.exports = rateLimiter;