import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Smart GST Billing — Professional Invoicing',
  description: 'AI-powered GST billing, invoice management, and GSTR-1 export for Indian businesses.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script id="unregister-sw" strategy="beforeInteractive">
          {`
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for(let registration of registrations) {
                  registration.unregister().then(function(boolean) {
                    if (boolean) {
                      console.log('Unregistered old service worker');
                      window.location.reload(true);
                    }
                  });
                }
              });
            }
          `}
        </Script>
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
