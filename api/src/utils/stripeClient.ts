import Stripe from 'stripe';

let client: Stripe | null = null;

/**
 * Lazily constructs the Stripe SDK client on first use instead of at module
 * load time. Stripe's constructor throws synchronously when no API key is
 * configured, and payment/webhook controllers are imported unconditionally
 * by app.ts — constructing it eagerly would crash the entire server on boot
 * for any deployment that hasn't configured Stripe yet.
 */
export function getStripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured (STRIPE_SECRET_KEY is missing).');
  }
  if (!client) {
    // No pinned apiVersion: defaults to the account's configured Stripe API
    // version. Pinning a literal here breaks on every Stripe SDK upgrade,
    // since the type is a literal union tied to that exact package version.
    client = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return client;
}
