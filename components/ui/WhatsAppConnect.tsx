"use client";

import { useEffect, useState } from "react";
import { waLink, siteConfig } from "@/lib/content/site";
import { FormField } from "@/components/ui/FormField";
import { WhatsAppIcon } from "@/components/ui/SocialIcon";

const inputClass =
  "w-full border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none";

/**
 * WhatsApp is still the actual transport — there's no backend in Phase 1 to
 * receive a form post. This opens a site-styled modal so composing the
 * message feels like part of the site rather than an instant hand-off to an
 * external tab; "Send" hands the composed text to wa.me, same as before.
 */
export function WhatsAppConnect({
  variant = "icon",
  label = "Message us on WhatsApp",
  defaultMessage = "",
  triggerClassName = "",
}: {
  variant?: "icon" | "cta";
  label?: string;
  defaultMessage?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState(defaultMessage);

  // Close on Escape and lock background scroll while the modal is open —
  // without this it behaves like a broken modal (scrollable page behind it,
  // no keyboard way out).
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const composed = name.trim() ? `Hi, I'm ${name.trim()}. ${message.trim()}` : message.trim();
    window.open(waLink(composed || undefined), "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Message us on WhatsApp"
        className={
          triggerClassName ||
          (variant === "icon"
            ? "flex h-9 w-9 items-center justify-center border border-line text-ink transition-colors hover:border-oxblood hover:text-oxblood"
            : "cta ghost")
        }
      >
        {variant === "icon" ? (
          <WhatsAppIcon className="h-4 w-4" />
        ) : (
          <span className="inline-flex items-center gap-2">
            <WhatsAppIcon className="h-4 w-4" />
            {label}
          </span>
        )}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="wa-modal-title"
            className="w-full max-w-sm border border-line bg-paper p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-oxblood">
                  WhatsApp
                </p>
                <h2 id="wa-modal-title" className="mt-1 font-display text-xl text-ink">
                  Message the House
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-lg leading-none text-muted hover:text-ink"
              >
                ✕
              </button>
            </div>
            <p className="mt-2 text-sm text-muted">
              Opens WhatsApp with your message ready to send to {siteConfig.phone}.
            </p>

            <form onSubmit={handleSend} className="mt-5 flex flex-col gap-4">
              <FormField label="Name (optional)" htmlFor="wa-name">
                <input
                  id="wa-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="Your name"
                />
              </FormField>
              <FormField label="Message" htmlFor="wa-message">
                <textarea
                  id="wa-message"
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className={inputClass}
                  placeholder="What can we help with?"
                />
              </FormField>
              <button type="submit" className="cta justify-center">
                Send on WhatsApp
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
