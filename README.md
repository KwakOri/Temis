This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Development uses Docker local Supabase by default:

```bash
npm run dev
# equivalent to: npm run dev:local
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Supabase Development Targets

Choose the DB target explicitly with these commands:

```bash
# Docker local Supabase (default)
npm run dev
npm run dev:local
npm run dev:local:db

# Clone remote data into Docker local Supabase, then start local dev
npm run dev:local:db:sync

# Temis remote Supabase
npm run dev:remote
```

### Local target

`dev:local`:

- starts or reuses the Docker local Supabase stack
- applies pending local migrations
- injects the local API URL, anon key, and service role key into Next.js
- starts Next.js without using remote Supabase credentials as its DB target

`dev:local:db` is an explicit alias for the same local-DB dev flow.

To refresh local data from the remote project, opt in explicitly:

1. Make sure Docker Desktop and Supabase CLI are installed.
2. Prepare one of these remote auth options:
   - Recommended: `SB_TOKEN_TEMIS` (or `SUPABASE_ACCESS_TOKEN`) + optional `SUPABASE_PROJECT_REF` (defaults to `ajlgjdwkjyayrnocdfpj`)
   - Alternative: `SUPABASE_REMOTE_DB_URL` direct connection string
3. Run:

```bash
npm run dev:local -- --dump
# equivalent explicit alias:
npm run dev:local:db:sync
```

Dump mode additionally:

- links to remote project when using token mode
- resets local DB to current local migrations
- dumps remote data (`public` by default)
- imports remote data into local DB
- applies pending local migrations again after import

Tip: pass Next.js args through the command, e.g. `npm run dev:local -- -p 3001`.
Tip: override copied schemas with `SUPABASE_REMOTE_DUMP_SCHEMAS` (comma-separated).
Tip: override excluded services with `SUPABASE_START_EXCLUDE` (comma-separated, empty string to disable exclusions).

### Remote target

Create an ignored `.env.remote.local` file with:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ajlgjdwkjyayrnocdfpj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-remote-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-remote-service-role-key
SUPABASE_PROJECT_REF=ajlgjdwkjyayrnocdfpj
```

Then run `npm run dev:remote`. The remote launcher validates the Temis project
host before starting and never prints either key. Do not commit the service role
key or place it in source code.

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
