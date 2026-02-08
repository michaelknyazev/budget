'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  FormGroup,
  InputGroup,
  Button,
  Intent,
  Callout,
  H2,
} from '@blueprintjs/core';
import { authClient } from '@/lib/auth-client';
import styles from './login.module.scss';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('test@budget.local');
  const [password, setPassword] = useState('test123456');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || 'Login failed');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <H2>Budget</H2>
        <p className={styles.subtitle}>Sign in to your account</p>

        <form onSubmit={handleLogin}>
          {error && (
            <Callout intent={Intent.DANGER} icon="error" className={styles.error}>
              {error}
            </Callout>
          )}

          <FormGroup label="Email" labelFor="email">
            <InputGroup
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              large
              autoFocus
            />
          </FormGroup>

          <FormGroup label="Password" labelFor="password">
            <InputGroup
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              large
            />
          </FormGroup>

          <Button
            type="submit"
            intent={Intent.PRIMARY}
            large
            fill
            loading={loading}
            disabled={!email || !password}
          >
            Sign In
          </Button>
        </form>

        <p className={styles.hint}>
          Test account: <code>test@budget.local</code> / <code>test123456</code>
        </p>
      </Card>
    </div>
  );
}
