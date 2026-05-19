'use client';

import React, { useState, useEffect } from 'react';
import { Skeleton } from '../ui/Skeleton';

export function DashboardStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="rounded-xl border p-6 space-y-3"
              style={{
                background: 'var(--color-bg-card)',
                borderColor: 'var(--color-border)',
              }}
            >
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-32" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
            <Skeleton className="h-4 w-28" />
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          </div>
          <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
            <Skeleton className="h-4 w-28" />
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const totalRevenue = stats.totalRevenue || 0;
  const thisMonthRevenue = stats.thisMonthRevenue || 0;
  const recentInvoices = stats.recentInvoices || [];
  const topCustomers = stats.topCustomers || [];

  const statCards = [
    {
      label: 'Total Revenue',
      value: `₹${totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
    },
    {
      label: 'This Month',
      value: `₹${thisMonthRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
    },
    {
      label: 'Total Invoices',
      value: (stats.totalInvoices || 0).toString(),
    },
    {
      label: 'Customers',
      value: (stats.totalCustomers || 0).toString(),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Minimal metric stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <div
            key={i}
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '24px',
            }}
          >
            <p className="stat-label mb-2">{stat.label}</p>
            <h3
              style={{
                fontSize: '28px',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                lineHeight: 1.1,
              }}
            >
              {stat.value}
            </h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Recent Invoices</p>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', background: '#FAFAFA' }}>
                <th className="th-label px-5 py-3">Invoice #</th>
                <th className="th-label px-5 py-3">Customer</th>
                <th className="th-label px-5 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.length > 0 ? recentInvoices.map((inv: any) => (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3 text-sm font-medium" style={{ color: 'var(--color-primary)' }}>{inv.invoice_number}</td>
                  <td className="px-5 py-3 text-sm" style={{ color: 'var(--color-text-primary)' }}>{inv.customer_name}</td>
                  <td className="px-5 py-3 text-sm text-right font-semibold" style={{ color: 'var(--color-text-primary)' }}>₹{Number(inv.grand_total).toFixed(2)}</td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>No invoices yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Top Customers */}
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '16px' }}>Top Customers</p>
          {topCustomers.length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color: 'var(--color-text-muted)' }}>No customer data yet</p>
          ) : (
            <div className="space-y-2">
              {topCustomers.map((cust: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        background: '#F3F4F6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#374151',
                        flexShrink: 0,
                      }}
                    >
                      {cust[0].substring(0, 1).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{cust[0]}</span>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    ₹{Number(cust[1]).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
