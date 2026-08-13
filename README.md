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

# Restore remote data into Docker local Supabase (does not start Next.js)
npm run db:restore:remote:fresh

# Temis remote Supabase
npm run dev:remote
```

### Local target

`dev:local`:

- starts or reuses the Docker local Supabase stack
- starts only the local database, API gateway/PostgREST, and Auth services by default;
  Realtime, Storage, Studio, mail, analytics, and other optional services stay excluded
- override the exclusion list only when a feature explicitly needs an optional service with
  `SUPABASE_START_EXCLUDE`
- applies pending local migrations
- injects the local API URL, publishable key, and secret key into the server
  runtime (no Supabase key is exposed through `NEXT_PUBLIC_*`)
- starts Next.js without using remote Supabase credentials as its DB target

`dev:local:db` is an explicit alias for the same local-DB dev flow.

To refresh local data from the remote project, run the restore step explicitly.
The restore command does not start Next.js; start the app separately after it
finishes:

1. Make sure Docker Desktop and Supabase CLI are installed.
2. Prepare one of these remote auth options:
   - Recommended: `SB_TOKEN_TEMIS` (or `SUPABASE_ACCESS_TOKEN`) + optional `SUPABASE_PROJECT_REF` (defaults to `ajlgjdwkjyayrnocdfpj`)
   - Alternative: `SUPABASE_REMOTE_DB_URL` direct connection string
3. Run:

```bash
npm run db:restore:remote -- --fresh-local
npm run dev:local
```

The restore command:

- links to remote project when using token mode
- reads the remote migration version and creates the dump before replacing local data
- with `--fresh-local`, replaces only the local Supabase DB container/volume
- resets the local schema to the remote migration version
- dumps remote data (`public` by default)
- imports remote data in one transaction
- applies all pending local migrations and runs integrity checks

`npm run dev:local:db:sync` remains an alias for the restore command. Use
`--keep-dump` to preserve the temporary dump for inspection. Use
`--allow-missing-tables` only when a missing table is intentionally excluded
from the local schema; the default is to stop and require review.

`--fresh-local` is destructive only to the local Supabase DB container/volume.
It does not write to or alter the remote project, and it does not remove local
Storage data.

Tip: pass Next.js args through the command, e.g. `npm run dev:local -- -p 3001`.
Tip: override copied schemas with `SUPABASE_REMOTE_DUMP_SCHEMAS` (comma-separated).
Tip: override excluded services with `SUPABASE_START_EXCLUDE` (comma-separated, empty string to disable exclusions).

## Development Verification

The repository contains large image assets, so production build tests are intentionally
excluded from the normal development loop. Prefer `npm run lint`, `npx tsc --noEmit`, and
the focused `check:*` scripts. If the sandbox reports an `tsx` IPC `EPERM`, run the same
check with `node --import tsx scripts/<check-file>`.

### Remote target

Create an ignored `.env.remote.local` file with:

```bash
SUPABASE_URL=https://ajlgjdwkjyayrnocdfpj.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SECRET_KEY=sb_secret_xxx
SUPABASE_PROJECT_REF=ajlgjdwkjyayrnocdfpj
```

Then run `npm run dev:remote`. The remote launcher validates the Temis project
host and both new key formats before starting, and never prints either key. Do
not commit the secret key or place it in source code. Browser code reads public
catalog data through `/api/shop/templates*`; it does not initialize a Supabase
client.

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
