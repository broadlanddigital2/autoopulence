// @ts-nocheck
// Stand-in for next/navigation.
export function notFound() { throw new Error("NOT_FOUND"); }
export function redirect(u) { if (typeof window !== "undefined") window.location.href = u; throw new Error("REDIRECT " + u); }
export function usePathname() { return globalThis.__AO_ROUTE || (typeof window !== "undefined" ? window.location.pathname : "/"); }
export function useSearchParams() { return new URLSearchParams(typeof window !== "undefined" ? window.location.search : ""); }
export function useRouter() { return { push: (u) => { window.location.href = u; }, replace: (u) => { window.location.replace(u); }, back: () => history.back(), refresh: () => location.reload(), prefetch: () => {} }; }
