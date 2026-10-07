# Auto Opulence Next.js website

This is the complete external-hosting source package for the Auto Opulence website. It uses standard Next.js commands and Node-compatible API routes.

## Quick start

1. Copy `.env.example` to `.env.local` and add the production values.
2. Run `npm ci`.
3. Run `npm run build`.
4. Run `npm start`.

Node.js 22.13 or newer is required. See `EXTERNAL-HOSTING.md` for full deployment notes, environment variables and Plesk guidance.

The original `.openai/hosting.json` is included as requested. It is retained for project identification and is not required by an external Node.js host.

## Email delivery

The enquiry form posts to the same-origin Next.js route at `/api/enquiry`. That server-side proxy validates the submission and sends both the internal notification and customer confirmation through SendGrid SMTP using Nodemailer. The browser never receives the SMTP password, and the package contains no `cloudflare:sockets` or `cloudflare:workers` dependency.
