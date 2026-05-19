'use client';

import React, { useEffect, useState } from 'react';
import { Receipt, LogOut, ChevronDown } from 'lucide-react';
import { authClient } from '@/lib/auth/client';

export function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      setUser(data?.user ?? null);
      setIsLoaded(true);
    });
    // Fetch business name to display in header instead of raw username
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => { if (d && !d.error) setBusiness(d); })
      .catch(() => {});
  }, []);

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = '/sign-in';
  };

  const displayName = business?.name || user?.name || 'My Business';
  const displayEmail = user?.email || '';

  return (
    <nav
      className="no-print"
      style={{
        background: 'var(--color-header-bg)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div
              style={{
                background: 'var(--color-primary)',
                borderRadius: '8px',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Receipt className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold text-base tracking-tight">
              GST Billing
            </span>
          </div>

          {/* Right side */}
          {isLoaded && user && (
            <div className="flex items-center gap-3">
              {/* Business info */}
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-white text-sm font-medium leading-tight">
                  {displayName}
                </span>
                <span className="text-xs leading-tight" style={{ color: 'var(--color-text-muted)' }}>
                  {displayEmail}
                </span>
              </div>
              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-sm font-medium transition"
                style={{
                  color: '#9CA3AF',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '7px',
                  padding: '5px 12px',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.35)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = '#9CA3AF';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)';
                }}
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
