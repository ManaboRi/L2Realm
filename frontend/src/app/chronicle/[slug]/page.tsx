import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChroniclePage } from '../../_components/ChroniclePage';
import { CHRONICLE_CONFIGS } from '../../_lib/chronicleConfig';

const SITE = 'https://l2realm.ru';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return ['interlude', 'high-five', 'classic', 'essence'].map(slug => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cfg = CHRONICLE_CONFIGS[slug];
  if (!cfg) return { title: 'Хроника не найдена', robots: { index: false, follow: false } };
  const canonical = `${SITE}/chronicle/${cfg.slug}`;
  return {
    title: cfg.title,
    description: cfg.description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      title: cfg.h1,
      description: cfg.description,
      url: canonical,
      siteName: 'L2Realm',
      locale: 'ru_RU',
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const cfg = CHRONICLE_CONFIGS[slug];
  if (!cfg) notFound();
  return <ChroniclePage cfg={cfg} />;
}
