import { Banknote } from 'lucide-react';

/* Accepted-payment marks for the footer.
   Real card schemes get their actual brand marks (drawn as inline SVG in the
   correct brand colours) rather than a generic UI icon — a row of identical
   grey glyphs reads as unfinished and doesn't tell anyone what is accepted.
   Cash on delivery is NOT a brand, so it is the one entry that legitimately
   uses an interface icon plus a label. */

const Chip = ({ children, label }) => (
  <span
    title={label}
    aria-label={label}
    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[6px] bg-white px-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.15)]"
  >
    {children}
  </span>
);

export default function PaymentMarks({ dict }) {
  const t = dict.payment;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={t.accept}>
      {/* Visa — wordmark in Visa blue */}
      <Chip label="Visa">
        <svg viewBox="0 0 48 16" className="h-3.5 w-auto" role="presentation" focusable="false">
          <text
            x="0" y="13"
            fill="#1434CB"
            style={{ font: 'italic 900 15px ui-sans-serif, system-ui, sans-serif', letterSpacing: '-0.02em' }}
          >
            VISA
          </text>
        </svg>
      </Chip>

      {/* Mastercard — interlocking circles */}
      <Chip label="Mastercard">
        <svg viewBox="0 0 40 24" className="h-5 w-auto" role="presentation" focusable="false">
          <circle cx="15" cy="12" r="9.5" fill="#EB001B" />
          <circle cx="25" cy="12" r="9.5" fill="#F79E1B" />
          <path
            d="M20 4.6a9.47 9.47 0 0 0 0 14.8 9.47 9.47 0 0 0 0-14.8Z"
            fill="#FF5F00"
          />
        </svg>
      </Chip>

      {/* Apple Pay —  glyph + Pay */}
      <Chip label="Apple Pay">
        <svg viewBox="0 0 44 18" className="h-4 w-auto" role="presentation" focusable="false">
          <path
            d="M8.9 4.2c.5-.62.85-1.47.76-2.32-.73.03-1.62.49-2.15 1.1-.47.54-.89 1.4-.78 2.23.82.06 1.65-.42 2.17-1.01Zm.75 1.19c-1.2-.07-2.22.68-2.79.68-.58 0-1.45-.64-2.39-.63-1.23.02-2.37.72-3 1.83-1.28 2.22-.33 5.5.91 7.3.61.89 1.34 1.88 2.29 1.85.92-.04 1.27-.59 2.38-.59 1.11 0 1.42.59 2.39.57.99-.02 1.61-.9 2.22-1.79.7-1.02.98-2.01 1-2.06-.02-.02-1.92-.74-1.94-2.93-.02-1.83 1.49-2.71 1.56-2.75-.85-1.26-2.18-1.4-2.63-1.48Z"
            fill="#000"
          />
          <text x="16" y="14" fill="#000" style={{ font: '600 12px ui-sans-serif, system-ui, sans-serif' }}>Pay</text>
        </svg>
      </Chip>

      {/* Cash on delivery — not a brand, so an interface icon is correct here */}
      <Chip label={t.cod}>
        <Banknote className="h-4 w-4 text-ink" strokeWidth={1.8} />
        <span className="text-[0.6rem] font-extrabold uppercase tracking-wide text-ink">{t.codShort}</span>
      </Chip>
    </div>
  );
}
