import React from 'react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ background: '#E5E7EB', ...style }}
    />
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <Skeleton className="h-4 w-full" style={{ maxWidth: i === 0 ? '100px' : undefined }} />
        </td>
      ))}
    </tr>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl p-5 border animate-pulse" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}>
      <div className="flex items-start gap-4 mb-4">
        <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <Skeleton className="h-3 w-full mb-2" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

export function StatsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-${count} gap-3 mt-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </div>
  );
}
