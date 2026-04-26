/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  allowedDevOrigins: [
    'https://9003-firebase-studio-1748625231387.cluster-fkltigo73ncaixtmokrzxhwsfc.cloudworkstations.dev',
    'https://6000-firebase-studio-1748625231387.cluster-fkltigo73ncaixtmokrzxhwsfc.cloudworkstations.dev',
  ],
};

module.exports = nextConfig;