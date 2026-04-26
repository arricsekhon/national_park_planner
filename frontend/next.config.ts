import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.nps.gov" },
      { protocol: "https", hostname: "*.nps.gov" },
      { protocol: "https", hostname: "openweathermap.org" },
      { protocol: "http", hostname: "openweathermap.org" },
    ],
  },
};

export default nextConfig;
