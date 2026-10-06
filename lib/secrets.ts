/**
 * Reads a signing secret. Built-in development secrets are allowed ONLY when NODE_ENV !== "production"
 * (a developer's machine). Any production build, including LOCAL_MODE self-hosting, must set a real secret
 * of at least 32 characters, otherwise requests that need it fail loudly instead of signing with a public value.
 */
export function requireSecret(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV !== "production") return value || devFallback;
  throw new Error(`${name} must be set to a random value of at least 32 characters`);
}
