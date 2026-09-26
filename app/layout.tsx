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
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.jpg"],
  },
};

const LOCAL_BUSINESS = {
  "@context": "https://schema.org",
  "@type": "ClothingStore",
  name: siteConfig.fullName,
  url: "https://ashok.navac.co.ke",
  image: "https://ashok.navac.co.ke/og-image.jpg",
  telephone: siteConfig.phone,
  email: siteConfig.email,
  address: { "@type": "PostalAddress", addressLocality: "Ridgeways, Nairobi", addressCountry: "KE" },
  openingHours: "Mo-Sa 09:00-18:00",
  priceRange: "KES 32,000+",
  sameAs: ["https://www.facebook.com/Ashoksunnytailored/", "https://www.instagram.com/ashok_sunny_/"],
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(LOCAL_BUSINESS) }} />
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
