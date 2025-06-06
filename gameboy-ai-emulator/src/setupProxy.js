const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Add security headers for SharedArrayBuffer
  app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
  });
};
