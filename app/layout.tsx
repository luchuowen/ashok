/**
 * Ashok Sunny Tailored — ashok.navac.co.ke
 * Developer: Owen Luchu <luchuowen@gmail.com>
 */
import type { Metadata } from "next";
import { Fraunces, Work_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { StickyBookBar } from "@/components/layout/StickyBookBar";
import { siteConfig } from "@/lib/content/site";
import { CartProvider } from "@/app/cart-context";
import { AuthProvider } from "@/app/auth-context";

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const TITLE = `${siteConfig.name} — Bespoke & Made-to-Measure Tailoring, Nairobi`;
const DESCRIPTION =
  "Bespoke and made-to-measure tailoring in Nairobi. Cut from your own pattern, fitted in person, kept on record for the next one.";

export const metadata: Metadata = {
  metadataBase: new URL("https://ashok.navac.co.ke"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    siteName: siteConfig.fullName,
    locale: "en_KE",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${fraunces.variable} ${workSans.variable} pb-20 antialiased min-[900px]:pb-0`}
      >
        <AuthProvider>
          <CartProvider>
            <Header />
            {children}
            <Footer />
            <StickyBookBar />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
