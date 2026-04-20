import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  reactStrictMode: false,
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;