import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Toaster } from 'sonner';
import { ThemeProvider } from '../components/theme-provider';
import './globals.css';

const poppins = localFont({
  src: [
    {
      path: './fonts/Poppins-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/Poppins-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: './fonts/Poppins-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: './fonts/Poppins-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'HPC | Health & Pain Care Center, Jashore',
  description:
    'Realtime physiotherapy center management — specialized pain care & rehabilitation portal.',
  manifest: '/manifest.webmanifest',
  applicationName: 'HPC Jashore',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'HPC Jashore',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${poppins.variable} font-sans min-h-screen antialiased`}
    >
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
        <script
          // Apply saved theme before first paint (no flash).
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('hpc-theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t;if(t==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})()`,
          }}
        />
        <script
          // Register service worker for offline PWA resilience and force update check
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').then(function(reg){reg.update();}).catch(function(){});});}`,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col font-sans bg-background text-foreground selection:bg-emerald-500/20 antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
