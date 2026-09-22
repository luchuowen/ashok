"use client";

import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { useAdminSession } from "@/app/admin/admin-session-context";

export function AdminHeader() {
  const { signOut } = useAdminSession();

  return (
    <Section border={false} className="border-b border-line !py-8">
      <div className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
        <h1 className="font-display text-3xl">Staff — Ashok Sunny Tailored</h1>
        <Button variant="ghost" onClick={() => void signOut()}>
          Sign Out
        </Button>
      </div>
    </Section>
  );
}
