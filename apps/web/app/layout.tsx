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

import { Hind_Siliguri, Noto_Sans_Bengali, Geist } from 'next/font/google';

const hindSiliguri = Hind_Siliguri({
  weight: ['400', '500', '600', '700'],
  subsets: ['bengali'],
  variable: '--font-bengali',
  display: 'swap',
});

const notoSansBengali = Noto_Sans_Bengali({
  weight: ['400', '500', '600', '700'],
  subsets: ['bengali'],
  variable: '--font-noto-bengali',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#059669' },
    { media: '(prefers-color-scheme: dark)', color: '#022c22' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

import { LanguageProvider } from '../lib/i18n';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="bn"
      suppressHydrationWarning
      className={cn("min-h-screen", "antialiased", poppins.variable, hindSiliguri.variable, notoSansBengali.variable, "font-sans", geist.variable)}
    >
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="HPC Jashore" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="application-name" content="HPC Jashore" />
        <meta name="msapplication-TileColor" content="#059669" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="format-detection" content="telephone=no" />
        <script
          // Universal browser autofill suppression across all dynamic inputs & forms
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                function sanitizeNode(el){
                  if(!el || !el.setAttribute) return;
                  var tag = el.tagName;
                  if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'){
                    el.setAttribute('autocomplete', 'off');
                    el.setAttribute('autocorrect', 'off');
                    el.setAttribute('autocapitalize', 'off');
                    el.setAttribute('spellcheck', 'false');
                    el.setAttribute('data-lpignore', 'true');
                    el.setAttribute('data-1p-ignore', 'true');
                    el.setAttribute('data-bwignore', 'true');
                    el.setAttribute('data-form-type', 'other');
                  } else if(tag === 'FORM'){
                    el.setAttribute('autocomplete', 'off');
                    el.setAttribute('data-lpignore', 'true');
                    el.setAttribute('data-1p-ignore', 'true');
                    el.setAttribute('data-bwignore', 'true');
                  }
                }
                function scan(root){
                  if(!root || !root.querySelectorAll) return;
                  sanitizeNode(root);
                  var nodes = root.querySelectorAll('input, textarea, select, form');
                  for(var i = 0; i < nodes.length; i++){
                    sanitizeNode(nodes[i]);
                  }
                }
                if(typeof document !== 'undefined'){
                  if(document.readyState === 'loading'){
                    document.addEventListener('DOMContentLoaded', function(){ scan(document.body); });
                  } else {
                    scan(document.body);
                  }
                  if(typeof MutationObserver !== 'undefined'){
                    var mo = new MutationObserver(function(mutations){
                      for(var m = 0; m < mutations.length; m++){
                        var added = mutations[m].addedNodes;
                        for(var a = 0; a < added.length; a++){
                          scan(added[a]);
                        }
                      }
                    });
                    mo.observe(document.documentElement, { childList: true, subtree: true });
                  }
                }
              })();
            `,
          }}
        />
        <script
          // Apply saved theme before first paint (no flash).
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('hpc-theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t;if(t==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})()`,
          }}
        />
        <script
          // Register service worker for offline PWA resilience and force update check
          dangerouslySetInnerHTML={{
            __html: `
              if('serviceWorker' in navigator){
                window.addEventListener('load',function(){
                  navigator.serviceWorker.register('/sw.js').then(function(reg){
                    reg.update();
                  }).catch(function(){});
                });
              }
              // Auto-recover from mid-deployment Next.js chunk mismatches
              window.addEventListener('error', function(e) {
                if (e.target && (e.target.tagName === 'LINK' || e.target.tagName === 'SCRIPT')) {
                  var url = e.target.src || e.target.href || '';
                  if (url.indexOf('/_next/static/') !== -1) {
                    if (!sessionStorage.getItem('hpc_chunk_retry')) {
                      sessionStorage.setItem('hpc_chunk_retry', '1');
                      if ('caches' in window) {
                        caches.keys().then(function(keys){
                          return Promise.all(keys.map(function(k){ return caches.delete(k); }));
                        }).then(function(){
                          window.location.reload();
                        });
                      } else {
                        window.location.reload();
                      }
                    }
                  }
                }
              }, true);
              window.addEventListener('load', function(){
                setTimeout(function(){ sessionStorage.removeItem('hpc_chunk_retry'); }, 3000);
              });
            `,
          }}
        />
      </head>
      <body className="min-h-screen min-h-dvh flex flex-col font-sans bg-background text-foreground selection:bg-emerald-500/20 antialiased overscroll-none touch-manipulation">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="hpc-theme">
          <LanguageProvider>
            {children}
            <Toaster
              position="top-center"
              richColors
              offset="max(1.25rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))"
              toastOptions={{
                style: {
                  marginTop: 'max(0.5rem, env(safe-area-inset-top, 0px))',
                },
              }}
            />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
