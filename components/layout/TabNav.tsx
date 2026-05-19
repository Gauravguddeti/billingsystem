'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Package, History, Settings, Users } from 'lucide-react';
import { NavItem } from '@/types';

const tabs: NavItem[] = [
  { icon: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { icon: 'invoice', label: 'Invoice', href: '/invoice' },
  { icon: 'products', label: 'Products', href: '/products' },
  { icon: 'customers', label: 'Customers', href: '/customers' },
  { icon: 'history', label: 'History', href: '/history' },
  { icon: 'settings', label: 'Settings', href: '/settings' },
];

const iconMap = {
  dashboard: LayoutDashboard,
  invoice: FileText,
  products: Package,
  customers: Users,
  history: History,
  settings: Settings,
};

export function TabNav() {
  const pathname = usePathname();

  return (
    <div className="bg-white no-print fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 md:relative md:border-t-0 md:border-b md:shadow-sm md:mb-6 pb-2 pt-1 md:pb-0 md:pt-0">
      <div className="max-w-7xl mx-auto px-1 sm:px-6 lg:px-8">
        <div className="flex justify-around md:justify-start overflow-x-auto py-1 md:py-3 gap-1 md:gap-2 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = iconMap[tab.icon as keyof typeof iconMap];
            const isActive = pathname.startsWith(tab.href);
            
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 rounded-lg transition whitespace-nowrap text-[10px] md:text-sm font-medium w-full md:w-auto`}
                style={isActive
                  ? { color: 'var(--color-primary)' }
                  : { color: '#6B7280' }
                }
              >
                <Icon
                  className="w-6 h-6 md:w-4 md:h-4"
                  style={{ color: isActive ? 'var(--color-primary)' : undefined }}
                />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
