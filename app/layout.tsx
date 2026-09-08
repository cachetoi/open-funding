import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'OpenFunding',
  description: 'Search public funding opportunities in one place.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body>{children}</body>
    </html>
  );
}
