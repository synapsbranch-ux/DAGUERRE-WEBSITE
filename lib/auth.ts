import { MongoClient } from "mongodb";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";

// MongoClient is deliberately lazy: constructing it does not open a socket.
// This keeps static builds possible without deployment secrets while every
// runtime auth operation still fails clearly until MONGODB_URI is configured.
// Keep configuration failures explicit.  The development defaults previously
// made it far too easy to deploy an instance protected by a known secret.
export function getAuth() {
  const uri = process.env.MONGODB_URI;
  const secret = process.env.BETTER_AUTH_SECRET;
  const baseURL = process.env.BETTER_AUTH_URL;
  if (!uri || !secret || !baseURL) throw new Error("Authentification non configurée : MONGODB_URI, BETTER_AUTH_SECRET et BETTER_AUTH_URL sont requis.");
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
  return betterAuth({
  database: mongodbAdapter(client.db(), { client, transaction: false }),
  secret,
  baseURL,
  emailAndPassword: { enabled: true, disableSignUp: true },
  user: { additionalFields: { role: { type: "string", required: false, defaultValue: "user", input: false } } },
  plugins: [nextCookies()],
  });
}
