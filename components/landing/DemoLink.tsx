import type { ReactNode } from 'react';

interface DemoLinkProps {
  className?: string;
  children: ReactNode;
}

/**
 * Entry point of the demo mode.
 * Plain <a>: /demo sets a cookie, it must never be prefetched by next/link.
 */
export default function DemoLink({ className, children }: DemoLinkProps) {
  return (
    <a href="/demo" className={className}>
      {children}
    </a>
  );
}
