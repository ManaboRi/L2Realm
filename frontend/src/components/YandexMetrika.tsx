'use client';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';

const COUNTER_ID = 108720146;

declare global {
  interface Window {
    ym?: (id: number, action: string, ...args: unknown[]) => void;
  }
}

function HitTracker() {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ym) return;
    const url = pathname + (search.toString() ? `?${search.toString()}` : '');
    window.ym(COUNTER_ID, 'hit', url, { referer: document.referrer });
  }, [pathname, search]);

  return null;
}

export function YandexMetrika() {
  return (
    <>
      <Script id="yandex-metrika" strategy="afterInteractive">
        {`
          (function(m,e,t,r,i,k,a){
            m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for (var j=0; j<document.scripts.length; j++){if(document.scripts[j].src===r){return;}}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
          })(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=${COUNTER_ID}','ym');
          ym(${COUNTER_ID}, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", accurateTrackBounce:true, trackLinks:true});
        `}
      </Script>
      <noscript>
        <div>
          <img src={`https://mc.yandex.ru/watch/${COUNTER_ID}`} style={{ position: 'absolute', left: '-9999px' }} alt="Yandex Metrika L2Realm" />
        </div>
      </noscript>
      <Suspense fallback={null}>
        <HitTracker />
      </Suspense>
    </>
  );
}
