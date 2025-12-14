import React, { useEffect, useMemo, useState } from 'react';
import { AdminDashboardContent } from './AdminDashboard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const SESSION_KEY = 'admin_mashau_authenticated';

const AdminMashauPermits: React.FC = () => {
  const { user, profile } = useAuth();
  const ADMIN_EMAIL = (import.meta as any).env?.VITE_ADMIN_EMAIL as string | undefined;

  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [error, setError] = useState<string | null>(null);

  // Consider a user as admin if their profile role is admin or their email matches the configured admin email
  const isSignedInAdmin = useMemo(() => {
    if (profile?.role === 'admin') return true;
    if (user?.email && ADMIN_EMAIL && user.email === ADMIN_EMAIL) return true;
    return false;
  }, [user?.email, profile?.role, ADMIN_EMAIL]);

  useEffect(() => {
    // Auto-authenticate if a signed-in admin visits this page
    if (isSignedInAdmin && !authenticated) {
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
      setAuthenticated(true);
      setError(null);
    }
  }, [isSignedInAdmin, authenticated]);

  useEffect(() => {
    // Clear error when password changes
    setError(null);
  }, [password]);

  // If invite token present in URL, attempt verify (Legacy Supabase logic removed)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    if (invite && !authenticated) {
        // Mock verification or redirect to login
        console.warn("Invite verification is legacy. Please log in as admin.");
        setError("Invite links are deprecated. Please log in.");
    }
  }, [authenticated]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!password) {
      setError('Enter the admin password');
      return;
    }

    // Simple local check against env var for emergency access if not logged in
    // Or just require login.
    const ADMIN_PASSWORD = (import.meta as any).env?.VITE_ADMIN_PASSWORD;
    
    if (password === ADMIN_PASSWORD) {
        try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
        setAuthenticated(true);
        setError(null);
    } else {
        setError('Invalid password');
        setAuthenticated(false);
    }
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {}
    setAuthenticated(false);
    setPassword('');
  };

  // When not authenticated by any method, show password form with an option to sign in instead
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4">Admin Access (Mashau Permits)</h2>
          <p className="text-sm text-muted-foreground mb-4">Enter the admin access password to continue, or sign in with your admin account.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
              />
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <Button className="btn-medical-primary" onClick={handleSubmit}>
                Unlock Admin Panel
              </Button>

              <Button variant="outline" className="btn-medical-secondary" onClick={() => window.dispatchEvent(new Event('openAuthModal'))}>
                Sign In
              </Button>
            </div>

            <div className="text-xs text-muted-foreground mt-4">This direct access link should only be shared with trusted administrators.</div>
          </form>
        </div>
      </div>
    );
  }

  // If authenticated via password/invite and not signed-in admin, provide a minimal admin profile for dashboard
  const shouldBypassAuth = !isSignedInAdmin;
  const overrideProfile = shouldBypassAuth
    ? {
        id: 'mashau-admin',
        role: 'admin',
        email: ADMIN_EMAIL || 'admin@example.com',
        first_name: 'Mashau',
        last_name: 'Admin'
      }
    : undefined;

  return (
    <div>
      <div className="flex justify-end p-4">
        <Button variant="ghost" onClick={handleLogout}>Logout</Button>
      </div>
      <AdminDashboardContent overrideProfile={overrideProfile} bypassAuth={shouldBypassAuth} />
    </div>
  );
};

export default AdminMashauPermits;
