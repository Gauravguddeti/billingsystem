'use client';

import React, { useEffect, useState } from 'react';
import { Briefcase, LogOut } from 'lucide-react';
import { authClient } from '@/lib/auth/client';

export function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      setUser(data?.user ?? null);
      setIsLoaded(true);
    });
  }, []);

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = '/sign-in';
  };

  return (
    <nav className="bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <Briefcase className="text-white w-6 h-6" />
            <span className="text-white font-bold text-xl tracking-tight">Smart GST Billing</span>
          </div>
          <div className="flex items-center gap-4">
            {isLoaded && user && (
              <div className="flex items-center gap-3">
                <div className="text-sm text-indigo-100 hidden sm:block">
                  <div className="font-medium text-white">{user.name || 'User'}</div>
                  <div className="text-xs opacity-80">{user.email}</div>
                </div>
                <button 
                  onClick={handleSignOut}
                  className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-white transition flex items-center gap-2"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:block">Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
