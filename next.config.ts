import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 정적 HTML 로 내보낸다(out/) — Cloudflare Pages 에 그대로 올린다
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
