'use client';

import React, { useState, useEffect } from 'react';
import { IndianRupee, FileText, Users, TrendingUp } from 'lucide-react';
import { Invoice, Product, Customer } from '@/types';
import { Spinner } from '../ui/Spinner';

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
      <div className="flex justify-center items-center h-64">
        <Spinner className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin inline-block" />
      </div>
    );
  }

  if (!stats) return null;

  const totalRevenue = stats.totalRevenue || 0;
  const thisMonthRevenue = stats.thisMonthRevenue || 0;
  const topCustomers = stats.topCustomers || [];
  const recentInvoices = stats.recentInvoices || [];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString('en-IN', {minimumFractionDigits:2})}`, icon: <IndianRupee className="w-6 h-6" />, color: 'indigo' },
          { label: 'This Month', value: `₹${thisMonthRevenue.toLocaleString('en-IN', {minimumFractionDigits:2})}`, icon: <TrendingUp className="w-6 h-6" />, color: 'green' },
          { label: 'Total Invoices', value: stats.totalInvoices || 0, icon: <FileText className="w-6 h-6" />, color: 'purple' },
          { label: 'Customers', value: stats.totalCustomers || 0, icon: <Users className="w-6 h-6" />, color: 'emerald' },
        ].map((stat, i) => (
          <div key={i} className={`bg-white rounded-xl shadow p-5 border-l-4 border-${stat.color}-500 flex items-center justify-between hover:shadow-md transition`}>
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-1">{stat.label}</p>
              <h3 className="text-xl font-bold text-gray-800">{stat.value}</h3>
            </div>
            <div className={`bg-${stat.color}-50 p-3 rounded-lg text-${stat.color}-500`}>{stat.icon}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-base font-bold text-gray-800">📄 Recent Invoices</h3>
          </div>
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-700">Invoice #</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-700">Customer</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-700 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentInvoices.length > 0 ? recentInvoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-sm font-medium text-indigo-600">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{inv.customer_name}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold">₹{Number(inv.grand_total).toFixed(2)}</td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400 text-sm">No invoices yet</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="text-base font-bold text-gray-800 mb-4">🌟 Top Customers</h3>
          {topCustomers.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-sm">No customer data yet</p>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((cust: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-600 flex items-center justify-center font-bold text-sm">
                      {cust[0].substring(0, 1).toUpperCase()}
                    </div>
                    <span className="font-semibold text-gray-800">{cust[0]}</span>
                  </div>
                  <span className="font-bold text-gray-800">₹{Number(cust[1]).toLocaleString('en-IN', {minimumFractionDigits:2})}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
