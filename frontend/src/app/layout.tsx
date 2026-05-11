import type { Metadata } from "next";
import "./globals.css";
import ReduxProvider from "@/store/ReduxProvider";
import AuthGuard from "@/components/auth/AuthGuard";

export const metadata: Metadata = {
  title: "SolarArchitect | Technical Precision",
  description: "Solar panel design and analysis platform with LiDAR integration",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* ReduxProvider wraps everything — persists auth tokens across reloads */}
        <ReduxProvider>
          {/* AuthGuard enforces login on every protected route */}
          <AuthGuard>
            {children}
          </AuthGuard>
        </ReduxProvider>
      </body>
    </html>
  );
}
