import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import Navbar from '@/components/layouts/header/Navbar';
import Footer from '@/components/layouts/footer/Footer';
import { AuthProvider } from '@/providers/Auth.provider';
import { ThemeProvider } from '@/providers/Theme.provider';
import CompareBar from '@/components/shared/CompareBar';
import { SITE_URL } from '@/lib/config/env';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Sri Lanka Properties',
    template: '%s | Sri Lanka Properties',
  },
  description: 'Find your dream property in Sri Lanka — houses, apartments, land and commercial listings.',
};

// Runs before hydration so the correct theme class is present on first
// paint, avoiding a light-mode flash for users who prefer dark.
const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <div className="app-shell flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <CompareBar />
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
