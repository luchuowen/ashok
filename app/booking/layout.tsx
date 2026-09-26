import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta("Book a Consultation", "Book a consultation, measuring or fitting at our Ridgeways atelier in Nairobi — choose a time that suits you.", "/booking");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
