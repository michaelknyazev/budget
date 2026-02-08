/**
 * Seed script: creates a test user via better-auth API.
 *
 * Usage: pnpm --filter api db:seed
 */
async function main() {
  const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3001';

  console.log('Seeding database...');
  console.log(`Base URL: ${baseUrl}`);

  // Create test user via better-auth sign-up endpoint
  const response = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test User',
      email: 'test@budget.local',
      password: 'test123456',
    }),
  });

  if (response.ok) {
    const data = (await response.json()) as { user?: { email: string } };
    console.log('Test user created:', data.user?.email || 'test@budget.local');
  } else if (response.status === 422 || response.status === 409) {
    console.log(
      'Test user already exists (test@budget.local) — skipping creation.',
    );
  } else {
    console.error(
      `Failed to create test user: ${response.status} ${response.statusText}`,
    );
    const body = await response.text();
    console.error(body);
    process.exit(1);
  }

  console.log('Seed complete!');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
