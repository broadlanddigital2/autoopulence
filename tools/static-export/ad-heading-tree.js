// Browser half of the Google Ads page headings (worker/src/ad-headings.js has the full story). The Worker swaps the
// page's first H1 (and the paragraph under it) for ad clicks and leaves window.__AO_AD_HEADING = { from, h1, fromSub,
// subheading }. Before the page hydrates, this makes the same swap in the page's React elements, so React sees the same
// wording as the HTML and keeps it. The heading is found by its old wording; if it can't be found nothing changes.
// React's isValidElement and cloneElement are passed in so this file has no imports (and can be tested on its own).

const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
// The text of an element's children when they are only text (strings and numbers); null when there's anything else.
function plainText(children) {
  const list = Array.isArray(children) ? children.flat(Infinity) : [children];
  let out = "";
  for (const c of list) {
    if (c == null || c === false || c === true) continue;
    if (typeof c === "string" || typeof c === "number") out += String(c);
    else return null;
  }
  return out;
}

export function adHeadingTree(el, a, { isValidElement, cloneElement }) {
  if (!a || !a.from || !a.h1) return el;
  const st = { h1: false, sub: !a.fromSub };
  const isTag = (n, tag) => isValidElement(n) && n.type === tag;
  const matches = (n, tag, want) => isTag(n, tag) && norm(plainText(n.props.children)) === norm(want);

  function list(arr) {
    let changed = false;
    const out = arr.slice();
    for (let i = 0; i < out.length; i++) {
      if (!st.h1 && matches(out[i], "h1", a.from)) {
        out[i] = cloneElement(out[i], {}, a.h1); st.h1 = true; changed = true;
        if (!st.sub) {
          let j = i + 1;
          while (j < out.length && (out[j] == null || out[j] === false || (typeof out[j] === "string" && !out[j].trim()))) j++;
          if (j < out.length && matches(out[j], "p", a.fromSub)) { out[j] = cloneElement(out[j], {}, a.subheading); st.sub = true; }
        }
        continue;
      }
      const n = walk(out[i]);
      if (n !== out[i]) { out[i] = n; changed = true; }
      if (st.h1) break;
    }
    return changed ? out : arr;
  }

  function walk(n) {
    if (st.h1) return n;
    if (Array.isArray(n)) return list(n);
    if (!isValidElement(n)) return n;
    if (matches(n, "h1", a.from)) { st.h1 = true; return cloneElement(n, {}, a.h1); }
    const kids = n.props?.children;
    if (kids == null || typeof kids === "string" || typeof kids === "number") return n;
    const next = Array.isArray(kids) ? list(kids) : walk(kids);
    return next === kids ? n : cloneElement(n, {}, ...(Array.isArray(next) ? next : [next]));
  }

  return walk(el);
}
