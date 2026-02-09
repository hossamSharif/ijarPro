import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1a1a1a',
};

export const metadata: Metadata = {
  title: 'إيجار برو — Ijar Pro',
  description: 'منصة إدارة العقارات المتكاملة — Integrated Property Management Platform',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'إيجار برو',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/icon-192x192.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
