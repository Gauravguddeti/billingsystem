import React from 'react';

export function Spinner({ className = "w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin inline-block" }: { className?: string }) {
  return <div className={className} />;
}
