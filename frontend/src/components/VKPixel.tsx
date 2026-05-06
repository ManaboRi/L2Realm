'use client';
import Script from 'next/script';

const PIXEL_ID = process.env.NEXT_PUBLIC_VK_PIXEL_ID;

declare global {
  interface Window {
    VK?: {
      Retargeting?: {
        Init: (id: string) => void;
        Hit: () => void;
      };
    };
  }
}

export function VKPixel() {
  if (!PIXEL_ID) return null;

  return (
    <>
      <Script id="vk-pixel" strategy="afterInteractive">
        {`
          (function(){
            var t=document.createElement('script');
            t.type='text/javascript';
            t.async=true;
            t.src='https://vk.com/js/api/openapi.js?169';
            t.onload=function(){
              if(window.VK&&VK.Retargeting){
                VK.Retargeting.Init('${PIXEL_ID}');
                VK.Retargeting.Hit();
              }
            };
            document.head.appendChild(t);
          })();
        `}
      </Script>
      <noscript>
        <img src={`https://vk.com/rtrg?p=${PIXEL_ID}`} style={{ position: 'absolute', left: '-9999px' }} alt="VK Pixel L2Realm" />
      </noscript>
    </>
  );
}
