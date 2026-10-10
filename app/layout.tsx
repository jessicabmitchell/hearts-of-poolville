import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: {
    default: 'Hearts of Poolville',
    template: '%s · Hearts of Poolville',
  },
  description:
    'Hearts of Poolville is a community charity serving Poolville, Texas, with holiday dinners, an Angel Tree, Easter baskets, and back-to-school supplies.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=IBM+Plex+Mono:wght@500&family=Public+Sans:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <div className="wrap">
          <header className="top">
            <Link className="brand" href="/">
              <svg viewBox="0 0 32 32" aria-hidden="true">
                <path d="M16 29C4 20 3 11 9 7.5c3.2-1.8 6 .1 7 2.5 1-2.4 3.8-4.3 7-2.5 6 3.5 5 12.5-7 21.5z" />
              </svg>
              {SITE.name}
            </Link>
            <nav aria-label="Main">
              <Link href="/#what-we-do">What we do</Link>
              <Link href="/#get-involved">Get involved</Link>
            </nav>
          </header>
          {children}
          <footer className="site">
            <span>
              {SITE.name} &middot; {SITE.location}
            </span>
            <span>Neighbors helping neighbors.</span>
          </footer>
        </div>
      </body>
    </html>
  );
}
