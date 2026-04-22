import type { NextConfig } from "next";

// Security headers — выставляются на все ответы.
// X-Frame-Options: запрет iframe-ов (anti-clickjacking)
// X-Content-Type-Options: запрет MIME-sniffing
// Referrer-Policy: не утекаем полный URL на внешние сайты
// Permissions-Policy: отключаем ненужные браузерные API
// Strict-Transport-Security: форсим HTTPS на год
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // Иконки серверов хостятся пользователями на разных CDN — оставляем HTTPS-любой,
    // HTTP запрещаем (нельзя MITM) и SVG не оптимизируем (anti-XSS).
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
    dangerouslyAllowSVG: false,
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
    ];
  },
};

export default nextConfig;
