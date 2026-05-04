import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Smart GST Billing',
  description: 'AI-powered GST billing and order extraction',
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
      <body className={`${inter.className} font-sans bg-gray-50 min-h-screen text-gray-900`}>
        {children}
      </body>
    </html>
  );
}

