/* Designed "no photo yet" state. Tint cycles cream / blush / dusty-blue / sage
   from a hash of the product handle so a grid of image-less products reads as
   an intentional palette, not a broken one. Title set in Fraunces + a ✦. */
const TINTS = ['var(--cream)', 'var(--blush)', 'var(--blue)', 'var(--sage)'];

export function tintFor(handle = '') {
  let h = 0;
  for (let i = 0; i < handle.length; i++) h = (h * 31 + handle.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

export default function Placeholder({ handle, title, label, size = 'card' }) {
  return (
    <div className={`ph ph-${size}`} style={{ background: tintFor(handle) }} role="img" aria-label={label ? `${label}: ${title}` : title}>
      <span className="ph-spark" aria-hidden="true">✦</span>
      <span className="ph-title">{title}</span>
    </div>
  );
}
