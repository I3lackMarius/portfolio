process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/portfolio_test';
process.env.LOGIN_RATE_LIMIT_SECRET =
  'test-only-rate-limit-secret-not-for-deployment';

for (const name of Object.keys(process.env)) {
  if (name.startsWith('VITE_')) {
    delete process.env[name];
  }
}
