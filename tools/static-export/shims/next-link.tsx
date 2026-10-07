// @ts-nocheck
// Stand-in for next/link: a plain <a>. Pages are static HTML, so a normal navigation is all we need.
export default function Link({ href, prefetch, replace, scroll, shallow, passHref, legacyBehavior, ...rest }) {
  const h = typeof href === "string" ? href : (href?.pathname || "/") + (href?.query ? "?" + new URLSearchParams(href.query).toString() : "") + (href?.hash ? "#" + href.hash : "");
  return <a href={h} {...rest} />;
}
