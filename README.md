# Auto Opulence — website

The Auto Opulence site (autoopulence.co.uk), hosted on Cloudflare. Same setup as `rcg-website`.

| Folder | What it is |
| --- | --- |
| `dist/` | **The live website.** 82 static pages + images, sitemap.xml, robots.txt, 404 page. This is what Cloudflare serves. |
| `source/` | The original Next.js project. Edit content and pages here. |
| `tools/static-export/` | Converts `source/` into `dist/`, and bundles the Worker. |
| `worker/` | Small server that runs in front of `dist/`: redirects `www.` and `http://` to `https://autoopulence.co.uk`, and runs the site's own API routes from `source/app/api` (enquiry form + emails, security question, postcode lookup, SimplyBook bookings, payment return). `worker/dist/index.js` is generated. |
| `wrangler.jsonc` | Cloudflare config (Worker name `autoopulence`, serves `dist/`, runs the Worker first on every request). |

## Deploying

Cloudflare **Workers Builds** is connected to this repo: every push to `main` deploys automatically.
Build command: *(none)*. Deploy command: `npx wrangler deploy`.

## Editing the site

1. Change files in `source/` (content lives mostly in `source/lib/` and `source/components/`; pages in `source/app/`).
2. Run `npm run rebuild` (Node 22+). This regenerates `dist/` and `worker/dist/`.
3. Commit and push — Cloudflare deploys it.

Adding a new page: create it in `source/app/` as normal, then list its URL in `tools/static-export/pages.mjs`.

## How the build works

`tools/static-export` renders every page with React on the build machine (no Next.js server), writes each one to
`dist/<url>.html` with the same `<head>` tags Next.js would output (title, description, canonical, robots,
Open Graph, Twitter), and adds a small script that makes the interactive parts work in the browser (menus,
hero carousel, booking form, enquiry form, cookie banner). A few Next-only packages are replaced by stand-ins
in `tools/static-export/shims/` (links, scripts, icons, the service dropdown and the booking calendar).

Emails: Cloudflare Workers can't use SMTP, so the Worker sends the same emails through SendGrid's HTTPS API
using the existing SendGrid key (`SMTP_PASSWORD`). See `worker/src/shims/nodemailer.ts`.

## Settings (Cloudflare → Workers & Pages → autoopulence → Settings → Variables and Secrets)

Add these as **Secrets**:

| Name | What |
| --- | --- |
| `SMTP_PASSWORD` | SendGrid API key (needs *Mail Send* permission) |
| `ENQUIRY_CAPTCHA_SECRET` | Any long random string |
| `IDEAL_POSTCODES_API_KEY` | Postcode lookup key |
| `SIMPLYBOOK_REST_API_KEY`, `SIMPLYBOOK_RPC_API_KEY`, `SIMPLYBOOK_SECRET_API_KEY` | SimplyBook API keys |
| `SIMPLYBOOK_SESSION_SECRET` | Any long random string (signs customer login cookies) |

Optional: `SMTP_TO_EMAIL`, `SMTP_CC_EMAIL` (who receives enquiries; the code has defaults).
`SIMPLYBOOK_COMPANY_LOGIN`, `SMTP_FROM_EMAIL` and `SMTP_FROM_NAME` are set in `wrangler.jsonc`.

## Going live checklist

- [ ] Cloudflare: Workers & Pages → Create → Import a repository → `broadlanddigital2/autoopulence`.
      Build command empty, deploy command `npx wrangler deploy`.
- [ ] Add the secrets above, then redeploy.
- [ ] Test on the `*.workers.dev` address (it is kept out of Google automatically).
- [ ] `autoopulence.co.uk` must be a zone in this Cloudflare account. Then Settings → Domains & Routes → add
      **both** `autoopulence.co.uk` and `www.autoopulence.co.uk` as Custom Domains (the Worker redirects www).
- [ ] SimplyBook: payment return URLs keep working (`/booking/payment-complete/ext/invoice-payment/...`).
- [ ] Search Console: resubmit `https://autoopulence.co.uk/sitemap.xml`.
