import { setRequestLocale } from 'next-intl/server';
import { LandingContent } from './landing-content';

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LandingContent />;
}
