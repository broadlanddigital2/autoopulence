# Auto Opulence — external Next.js hosting

This archive contains the complete Auto Opulence website as a standard Next.js application. The original `.openai/hosting.json` file is included as requested. External hosting does not use that file, but it preserves the connection to the existing ChatGPT Site project.

## Requirements

- Node.js 22.13 or newer
- npm
- A hosting plan that supports a persistent Node.js application

## Install and run

1. Extract the archive into the application directory.
2. Copy `.env.example` to `.env.local` and enter the production values.
3. Run `npm ci`.
4. Run `npm run build`.
5. Start the website with `npm start`.

The default port is `3000`. Set the host-provided `PORT` environment variable when the hosting platform assigns a different port.

## Plesk

Set the document/application root to the extracted project folder, install dependencies, and run the build command. The project uses Next.js standalone output, so `.next/standalone/server.js` can be used as the Plesk startup file after building. Copy `public` and `.next/static` alongside the standalone output if deploying only the built application instead of the complete source package.

## Required production settings

- `SIMPLYBOOK_REST_API_KEY`, `SIMPLYBOOK_RPC_API_KEY`, `SIMPLYBOOK_SECRET_API_KEY` and `SIMPLYBOOK_SESSION_SECRET` for customer accounts, availability and payment-backed booking confirmation
- `SMTP_PASSWORD` plus the SMTP sender/recipient values for enquiry emails
- `ENQUIRY_CAPTCHA_SECRET` with a long random value for signing enquiry security challenges (recommended; otherwise `SMTP_PASSWORD` is used)
- `IDEAL_POSTCODES_API_KEY` for postcode lookup

Keep `.env.local` outside source control and never upload it to a public repository.

## Next.js email proxy and SendGrid SMTP

The public enquiry form sends JSON only to the website's own `/api/enquiry` endpoint. This Next.js Node route keeps the SMTP credentials server-side, validates the form data, loads the email images from `public/images/email`, and uses Nodemailer to connect to SendGrid SMTP.

Default SendGrid connection settings are:

- Server: `smtp.sendgrid.net`
- Port: `587`
- Username: `apikey`
- Password: supplied through the server-side `SMTP_PASSWORD` environment variable

No Cloudflare socket or Worker runtime import is used by the external-hosting package.
