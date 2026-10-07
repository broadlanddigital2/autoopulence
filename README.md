# Auto Opulence — website

The Auto Opulence site (autoopulence.co.uk), hosted on Cloudflare. Same setup as `rcg-website`.

| Folder | What it is |
| --- | --- |
| `dist/` | **The live website.** 82 static pages + images, sitemap.xml, robots.txt, 404 page. This is what Cloudflare serves. |
| `source/` | The original Next.js project. Edit content and pages here. |
| `tools/static-export/` | Converts `source/` into `dist/`, and bundles the Worker. |
| `worker/` | Small server that runs in front of `dist/`: redirects `www.` and `http://` to `https://autoopulence.co.uk`, forwards booking calls to the Race Car Graphics CRM (`/api/crm/booking`), and runs the site's own API routes from `source/app/api` (enquiry form + emails, security question, postcode lookup). `worker/dist/index.js` is generated. |
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

## Bookings

Bookings, customer accounts and payments use the **Race Car Graphics CRM** — the same system as racecargraphics.uk
(Supabase project `dipjypzrfigkzuarlsov`, business unit *Auto Opulence* `8a8a2f45-…`). Services, prices, vehicle
sizes, extras, packages and availability are managed in the CRM; the booking form loads them live. Payment is
Stripe checkout run by the CRM, which returns customers to `/booking/payment-complete`.

- Booking form: `source/components/ServiceBookingForm.tsx` (shared with RCG's site)
- Customer login (emailed 6-digit code, no password) and account: `source/components/CustomerAccount.tsx`
  (`/login`, `/signup`, `/account`). Customers have one account across Auto Opulence and Race Car Graphics.
- CRM client: `source/lib/crm-booking.ts`; catalogue helpers: `source/lib/vehicle-care.ts`
- The browser calls `/api/crm/booking` on this site and the Worker forwards it to the CRM, so the CRM doesn't need
  autoopulence.co.uk on its list of allowed browser origins.
- `source/lib/crm/vehicle-care.json` is a copy of the catalogue, refreshed by `npm run rebuild`
  (`tools/static-export/fetch-crm.mjs`); the form uses it until the live catalogue loads.

## Settings (Cloudflare → Workers & Pages → autoopulence → Settings → Variables and Secrets)

Add these as **Secrets**:

| Name | What |
| --- | --- |
| `SENDGRID_API_KEY` (or `SMTP_PASSWORD`) | SendGrid API key (needs *Mail Send* permission). `SENDGRID_API_KEY` wins if both are set. |
| `ENQUIRY_CAPTCHA_SECRET` | Any long random string |
| `IDEAL_POSTCODES_API_KEY` | Postcode lookup key |

Optional: `SMTP_TO_EMAIL`, `SMTP_CC_EMAIL` (who receives enquiries; the code has defaults).
`SMTP_FROM_EMAIL` and `SMTP_FROM_NAME` are set in `wrangler.jsonc`. Bookings need no settings.

## Going live checklist

- [ ] Cloudflare: Workers & Pages → Create → Import a repository → `broadlanddigital2/autoopulence`.
      Build command empty, deploy command `npx wrangler deploy`.
- [ ] Add the secrets above, then redeploy.
- [ ] Test on the `*.workers.dev` address (it is kept out of Google automatically).
- [x] Live domain: `wrangler.jsonc` routes `autoopulence.co.uk/*` and `www.autoopulence.co.uk/*` to the Worker
      (the zone's DNS records are unchanged; removing the routes hands the domain back to the old host).
- [ ] Make a test booking on the live domain and check it appears in the CRM, the Stripe payment returns to
      `/booking/payment-complete`, and the confirmation email arrives.
- [ ] Search Console: resubmit `https://autoopulence.co.uk/sitemap.xml`.
