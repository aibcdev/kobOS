This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

**Full product & technical design (cofounder.co / external handoff):** [docs/DESIGN.md](docs/DESIGN.md)

## Getting Started

Run the KOB dev server on port **3333** (avoids 3000 and other busy ports like 3002):

```bash
npm run dev:kob
```

Open [http://localhost:3333](http://localhost:3333). Set `NEXT_PUBLIC_SITE_URL` in `.env` to that same URL (including the port).

If **3333** is also busy, run `npx next dev --port 3456` (or any free port) and set `NEXT_PUBLIC_SITE_URL` to match. Update the `dev:kob` script in `package.json` if you want a permanent port.

### “Another next dev server is already running”

Next 16 only allows **one** `next dev` per project folder. Your terminal showed another instance on **3456** (PID in the error).

1. **Use the running app** — open the URL Next printed (e.g. `http://localhost:3456`).
2. **Or stop the old one** — run `kill <PID>` with the PID from the error message.
3. **Stale lock** — if nothing is listening but `dev:kob` still complains, run **`npm run dev:kob:reset`** (removes `.next/dev/lock` then starts on 3333). Only do this when no dev server is actually running.

You can start editing the app under `app/`; the page auto-updates as you edit files.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
