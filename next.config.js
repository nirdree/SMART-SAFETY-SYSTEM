/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mqtt', 'nodemailer'],
  },
};

module.exports = nextConfig;
