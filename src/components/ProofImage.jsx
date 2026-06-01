import { useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils.js';

// A proof-image thumbnail that opens an in-app lightbox (enlarged overlay with a
// clear close button) instead of navigating away to the raw file.
export default function ProofImage({ url, alt = 'Proof of payment', thumbClassName }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        // Beat any parent dialog's Esc handler so only the lightbox closes.
        e.stopImmediatePropagation();
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);

  // Only ever render genuine https URLs. proofImageUrl can be attacker-influenced
  // (a forged request doc), so this blocks javascript:/data: link abuse.
  if (!url || !/^https:\/\//i.test(url)) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block cursor-zoom-in rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="View proof image"
      >
        <img
          src={url}
          alt={alt}
          className={cn('block rounded-md border border-border object-cover', thumbClassName)}
        />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 sm:p-8"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute right-3 top-3 flex gap-2">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Open original in new tab"
              title="Open original in new tab"
            >
              <ExternalLink className="h-5 w-5" />
            </a>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpen(false); }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <img
            src={url}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] max-w-[94vw] rounded-md object-contain shadow-2xl"
          />

          <div className="pointer-events-none absolute bottom-4 left-0 right-0 text-center text-xs text-white/70">
            Tap anywhere or press Esc to close
          </div>
        </div>
      )}
    </>
  );
}
