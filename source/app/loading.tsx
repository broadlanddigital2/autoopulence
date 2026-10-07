export default function Loading() {
  return <div className="route-loader is-active" role="status" aria-live="polite" aria-label="Loading page"><div className="route-loader__mark"><span className="route-loader__ring" aria-hidden="true" /><span>Loading</span></div></div>;
}
