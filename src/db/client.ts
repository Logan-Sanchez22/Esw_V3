// DATABASE CLIENT — sets up the connection this server uses to talk to our
// Neon Postgres database. Neon is just regular Postgres hosted for us over
// HTTP (rather than a raw TCP connection), which is what makes it work from
// serverless functions like our API routes. Drizzle is an ORM ("Object-
// Relational Mapper") — instead of writing raw SQL strings everywhere, we
// call typed functions (see how `db` gets used in src/app/api/garden+api.ts)
// and Drizzle turns them into the actual SQL queries.
// This file only ever runs on the server (API routes), never inside the
// app on a user's phone — that's why it's safe for it to throw if
// DATABASE_URL is missing, and why that variable is NOT one of the
// EXPO_PUBLIC_-prefixed env vars (those are the only kind bundled into the
// client app — see .env.example).
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('Missing DATABASE_URL — server-only env var, see .env.example.');
}

// `drizzle(...)` wraps the raw Neon connection with the typed query layer.
// Passing `{ schema }` (our table definitions below) is what lets Drizzle
// know the shape of each table so query results come back typed instead of
// as plain `any` objects. Every API route imports this one `db` constant
// rather than creating its own connection.
export const db = drizzle(neon(DATABASE_URL), { schema });
