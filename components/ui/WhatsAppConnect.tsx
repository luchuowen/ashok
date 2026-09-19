"use client";

import { useEffect, useState } from "react";
import { siteConfig } from "@/lib/content/site";
import { FormField } from "@/components/ui/FormField";
import { MessageIcon } from "@/components/ui/SocialIcon";

const inputClass =
  "w-full border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none";

/**
 * The site's one "message the house" channel: a site-styled modal form that
 * emails the house via /api/message. Used to hand off to an external wa.me
 * tab — now it stays on-site end to end and leaves a record of every
 * enquiry instead of vanishing into someone's personal WhatsApp.
 */
export function WhatsAppConnect({
  variant = "icon",
  label = "Message the House",
  defaultMessage = "",
  triggerClassName = "",
  iconClassName = "h-4 w-4",
}: {
  variant?: "icon" | "cta";
  label?: string;
  defaultMessage?: string;
  triggerClassName?: string;
  iconClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState(defaultMessage);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMessage(defaultMessage);
  }, [defaultMessage]);

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

  function resetAndClose() {
    setOpen(false);
    setSent(false);
    setError(null);
    setName("");
    setContact("");
    setMessage(defaultMessage);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contact, message, context: label }),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) {
        setError(result.error || "Could not send your message. Try again.");
        setSubmitting(false);
        return;
      }
      setSent(true);
      setSubmitting(false);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        className={
          triggerClassName ||
          (variant === "icon"
            ? "flex h-9 w-9 items-center justify-center border border-line text-ink transition-colors hover:border-oxblood hover:text-oxblood"
            : "cta ghost")
        }
      >
        {variant === "icon" ? (
          <MessageIcon className={iconClassName} />
        ) : (
          <span className="inline-flex items-center gap-2">
            <MessageIcon className="h-4 w-4" />
            {label}
          </span>
        )}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-4 sm:items-center"
          onClick={resetAndClose}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="message-modal-title"
            className="w-full max-w-sm border border-line bg-paper p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-oxblood">
                  Message
                </p>
                <h2 id="message-modal-title" className="mt-1 font-display text-xl text-ink">
                  {label}
                </h2>
              </div>
              <button
                type="button"
                onClick={resetAndClose}
                aria-label="Close"
                className="text-lg leading-none text-muted hover:text-ink"
              >
                ✕
              </button>
            </div>

            {sent ? (
              <div className="mt-5">
                <p className="text-sm text-ink">Sent — we&apos;ll get back to you shortly.</p>
                <button type="button" onClick={resetAndClose} className="cta ghost mt-5">
                  Close
                </button>
              </div>
            ) : (
              <>
                <p className="mt-2 text-sm text-muted">
                  Sends straight to the house — we&apos;ll reply by phone or email.
                </p>

                <form onSubmit={handleSend} className="mt-5 flex flex-col gap-4">
                  <FormField label="Name (optional)" htmlFor="msg-name">
                    <input
                      id="msg-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                      placeholder="Your name"
                    />
                  </FormField>
                  <FormField label="Phone or email (optional)" htmlFor="msg-contact">
                    <input
                      id="msg-contact"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      className={inputClass}
                      placeholder={siteConfig.phone}
                    />
                  </FormField>
                  <FormField label="Message" htmlFor="msg-message">
                    <textarea
                      id="msg-message"
                      required
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className={inputClass}
                      placeholder="What can we help with?"
                    />
                  </FormField>
                  <button type="submit" className="cta justify-center" disabled={submitting}>
                    {submitting ? "Sending…" : "Send Message"}
                  </button>
                  {error ? <p className="text-sm text-oxblood">{error}</p> : null}
                </form>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
