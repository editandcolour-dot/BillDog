'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw new Error(signInError.message);

      if (data.user) {
        // Check if onboarding is complete by querying profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('municipality')
          .eq('id', data.user.id)
          .single();

        if (!profile?.municipality) {
          router.push('/onboarding');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (error) {
      console.error('[Auth]', error);
      setError('Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4 w-full max-w-sm">
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-500 text-red-100 rounded text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="sr-only" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 min-h-[44px] bg-white/5 border border-white/10 rounded text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange"
        />
      </div>

      <div>
        <label className="sr-only" htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 min-h-[44px] bg-white/5 border border-white/10 rounded text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange"
        />
      </div>

      <div className="text-right">
        <a href="/forgot-password" className="text-sm text-orange hover:text-white transition-colors">
          Forgot password?
        </a>
      </div>

      <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
        {isLoading ? 'Logging In...' : 'Log In'}
      </Button>
    </form>
  );
}
