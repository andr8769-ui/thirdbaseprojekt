/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prisma must stay external in server bundles so the generated client works on Vercel.
  serverExternalPackages: ["@prisma/client", "prisma"],
  experimental: {
    // Fil-upload via server actions: hæv grænsen til lige under Vercels hard limit på 4,5 MB.
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
