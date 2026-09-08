/* Animated print-counter scene for the /print hero.
   Server component on purpose: pure inline SVG + CSS keyframes, no JS and no
   hydration, so it cannot touch or delay the upload flow underneath it.
   All styles live in globals.css under "PRINT HERO — printer scene".
   Colours come from the existing brand tokens only.

   The loop: idle → sheet feeds in → head sweeps → print reveals line by line
   → finished sheet rests in the tray → reset. Under prefers-reduced-motion
   nothing animates and the scene sits in its finished state, which is a
   complete picture rather than an empty machine.

   Geometry notes (viewBox 420x420):
     tray sheet 20–106 · body 114–232 · front lip 220–240 (drawn OVER the
     paper so it reads as emerging) · output clip starts at 240 so paper is
     never visible above the lip · feet sit outside the paper's width. */
export default function PrinterScene({ label }) {
  return (
    <div className="printer-scene" role="img" aria-label={label}>
      <svg viewBox="0 0 420 420" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          {/* paper is only ever visible below the output lip */}
          <clipPath id="ps-out">
            <rect x="106" y="240" width="208" height="152" rx="4" />
          </clipPath>
          <linearGradient id="ps-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--ink)" />
            <stop offset="1" stopColor="color-mix(in srgb, var(--ink) 86%, black)" />
          </linearGradient>
        </defs>

        <ellipse cx="210" cy="398" rx="128" ry="11" fill="var(--ink)" opacity="0.10" />

        {/* ---- sheet waiting in the top feed tray ---- */}
        <g className="ps-feed">
          <rect x="136" y="20" width="148" height="86" rx="6" fill="#fff" stroke="var(--ink)" strokeOpacity="0.14" />
          <rect x="152" y="40" width="84" height="6" rx="3" fill="var(--ink)" opacity="0.16" />
          <rect x="152" y="56" width="116" height="6" rx="3" fill="var(--ink)" opacity="0.10" />
          <rect x="152" y="72" width="98" height="6" rx="3" fill="var(--ink)" opacity="0.10" />
        </g>

        {/* feed tray lip */}
        <rect x="112" y="100" width="196" height="14" rx="7" fill="var(--ink)" opacity="0.85" />

        {/* feet — outside the paper's width so they never overlap it */}
        <rect x="92" y="226" width="26" height="16" rx="6" fill="var(--ink)" opacity="0.7" />
        <rect x="302" y="226" width="26" height="16" rx="6" fill="var(--ink)" opacity="0.7" />

        {/* ---- printer body ---- */}
        <rect x="84" y="114" width="252" height="118" rx="26" fill="url(#ps-body)" />
        <rect x="98" y="126" width="224" height="10" rx="5" fill="#fff" opacity="0.09" />

        {/* mechanism window, print head sweeping behind it */}
        <rect x="112" y="146" width="196" height="30" rx="10" fill="#000" opacity="0.32" />
        <g className="ps-head-wrap">
          <rect className="ps-head" x="122" y="152" width="34" height="18" rx="6" fill="var(--coral)" />
        </g>

        {/* rollers */}
        <circle className="ps-roller" cx="132" cy="200" r="7" fill="#fff" opacity="0.22" />
        <circle className="ps-roller ps-roller-2" cx="288" cy="200" r="7" fill="#fff" opacity="0.22" />

        {/* control panel */}
        <rect x="248" y="190" width="60" height="22" rx="11" fill="#fff" opacity="0.10" />
        <circle className="ps-led" cx="262" cy="201" r="4.5" fill="var(--coral)" />
        <rect x="274" y="197" width="22" height="3" rx="1.5" fill="#fff" opacity="0.35" />
        <rect x="274" y="203" width="14" height="3" rx="1.5" fill="#fff" opacity="0.22" />

        {/* ---- the printed sheet emerging from the front slot ---- */}
        <g clipPath="url(#ps-out)">
          <g className="ps-sheet">
            <rect x="118" y="150" width="184" height="170" rx="5" fill="#fff" />
            <rect x="134" y="168" width="26" height="26" rx="7" fill="var(--sun)" />
            <text x="170" y="188" className="ps-title" fill="var(--ink)">TINY INKS</text>
            <rect x="134" y="212" width="152" height="5" rx="2.5" fill="var(--ink)" opacity="0.16" />
            <rect x="134" y="226" width="124" height="5" rx="2.5" fill="var(--ink)" opacity="0.12" />
            {/* three straplines share one slot, one visible per loop */}
            <text x="134" y="256" className="ps-line ps-line-1" fill="var(--coral)">PRINT · MAKE · CREATE</text>
            <text x="134" y="256" className="ps-line ps-line-2" fill="var(--coral)">YOUR IDEA STARTS HERE</text>
            <text x="134" y="256" className="ps-line ps-line-3" fill="var(--coral)">A4 · A3 · COLOUR · BOUND</text>
            {/* white wipe that slides DOWN the page to reveal the artwork as it
                prints. This replaces an animated <clipPath> child, which Chrome
                would not transform reliably — the artwork appeared instantly. */}
            <rect className="ps-wipe" x="117" y="149" width="186" height="132" fill="#fff" />
            {/* border drawn last so the wipe never hides the sheet edge */}
            <rect x="118" y="150" width="184" height="170" rx="5" fill="none" stroke="var(--ink)" strokeOpacity="0.12" />
          </g>
        </g>

        {/* front lip drawn OVER the paper so it emerges from underneath */}
        <rect x="96" y="220" width="228" height="20" rx="10" fill="var(--ink)" />
        <rect x="112" y="227" width="196" height="5" rx="2.5" fill="#000" opacity="0.45" />
      </svg>
    </div>
  );
}
