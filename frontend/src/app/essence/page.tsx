import type { Metadata } from 'next';
import { ChroniclePage } from '../_components/ChroniclePage';
import { CHRONICLE_CONFIGS } from '../_lib/chronicleConfig';

const cfg = CHRONICLE_CONFIGS.essence;
const SITE = 'https://l2realm.ru';

export const revalidate = 300;

export const metadata: Metadata = {
  title:       cfg.title,
  description: cfg.description,
  alternates:  { canonical: `${SITE}/${cfg.slug}` },
  openGraph: {
    type: 'website',
    title: cfg.h1,
    description: cfg.description,
    url: `${SITE}/${cfg.slug}`,
    siteName: 'L2Realm',
    locale: 'ru_RU',
  },
};

export default function Page() { return <ChroniclePage cfg={cfg} />; }
