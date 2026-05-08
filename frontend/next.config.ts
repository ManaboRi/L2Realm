import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://mc.yandex.ru https://vk.com https://*.vk.com https://top-fwz1.mail.ru`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://mc.yandex.ru https://mc.yandex.com wss://mc.yandex.com wss://mc.yandex.ru https://vk.com https://*.vk.com https://top-fwz1.mail.ru",
  "upgrade-insecure-requests",
].join("; ");

// Security headers — выставляются на все ответы.
// X-Frame-Options: запрет iframe-ов (anti-clickjacking)
// X-Content-Type-Options: запрет MIME-sniffing
// Referrer-Policy: не утекаем полный URL на внешние сайты
// Permissions-Policy: отключаем ненужные браузерные API
// Strict-Transport-Security: форсим HTTPS на год
const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
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
  async redirects() {
    return [
      { source: "/interlude", destination: "/chronicle/interlude", permanent: true },
      { source: "/high-five", destination: "/chronicle/high-five", permanent: true },
      { source: "/classic", destination: "/chronicle/classic", permanent: true },
      { source: "/essence", destination: "/chronicle/essence", permanent: true },
    ];
  },
};

export default nextConfig;
