/* Shimmer placeholders shaped like product cards — used as the Suspense
   fallback on shop pages so nothing jumps while data loads. */
export default function SkeletonGrid({ count = 6 }) {
  return (
    <div className="pgrid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div className="mcard skel-card" key={i}>
          <div className="skel skel-media" />
          <div className="mcard-info">
            <div className="skel skel-line" style={{ width: '40%' }} />
            <div className="skel skel-line" style={{ width: '85%' }} />
            <div className="skel skel-line" style={{ width: '30%', height: 16 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
