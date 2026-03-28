This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Local Supabase (Remote Data Mirror)

Run the app against local Supabase while cloning data from remote DB every time:

1. Add `SUPABASE_REMOTE_DB_URL` to `.env.local`.
2. Make sure Docker Desktop and Supabase CLI are installed.
3. Run:

```bash
npm run dev:local
```

What `dev:local` does:

- starts local Supabase containers
- resets local DB to a clean baseline
- dumps remote schema and data (`public` by default)
- imports remote schema/data into local DB
- starts Next.js with local Supabase URL/keys injected

Tip: pass Next.js args through the command, e.g. `npm run dev:local -- -p 3001`.
Tip: override copied schemas with `SUPABASE_REMOTE_DUMP_SCHEMAS` (comma-separated).

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# temis
