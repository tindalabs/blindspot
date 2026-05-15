/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/v1/traces',
        destination: 'http://localhost:4318/v1/traces',
      },
    ];
  },
};

module.exports = nextConfig;
