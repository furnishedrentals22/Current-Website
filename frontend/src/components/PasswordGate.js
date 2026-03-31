import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export const PasswordGate = ({ children }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isAuth = sessionStorage.getItem('app_authenticated');
    if (isAuth === 'true') setAuthenticated(true);
    setLoading(false);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API}/api/auth/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (data.valid) {
        sessionStorage.setItem('app_authenticated', 'true');
        setAuthenticated(true);
      } else {
        setError('Invalid password');
        setPassword('');
      }
    } catch {
      setError('Failed to verify. Please try again.');
    }
  };

  if (loading) return null;
  if (authenticated) return children;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="password-gate">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="font-heading text-xl tracking-tight">Furnished Rentals</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Enter password to access dashboard</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              autoFocus
              data-testid="password-gate-input"
            />
            {error && <p className="text-sm text-destructive text-center" data-testid="password-gate-error">{error}</p>}
            <Button type="submit" className="w-full" data-testid="password-gate-submit">
              Unlock
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
