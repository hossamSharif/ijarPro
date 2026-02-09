'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import {
  Building2,
  FileText,
  BookOpen,
  WifiOff,
  Languages,
  BarChart3,
  ArrowUpRight,
  Globe,
  ChevronDown,
  Building,
  Home,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WhatsAppFab } from '@/components/layout/whatsapp-fab';

const LOCALE_STORAGE_KEY = 'ijar-pro-locale';

/* ─────────── Geometric pattern SVG (Islamic-inspired) ─────────── */
function GeometricPattern({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      <defs>
        <pattern id="geo" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <path
            d="M20 0L40 20L20 40L0 20Z"
            stroke="currentColor"
            strokeWidth="0.5"
            opacity="0.15"
          />
          <circle cx="20" cy="20" r="3" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
        </pattern>
      </defs>
      <rect width="200" height="200" fill="url(#geo)" />
    </svg>
  );
}

/* ─────────── Intersection Observer hook for scroll-reveal ─────────── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('landing-visible');
          }
        });
      },
      { threshold: 0.15 }
    );

    const children = node.querySelectorAll('.landing-reveal');
    children.forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, []);

  return ref;
}

/* ─────────── Feature card data mapping ─────────── */
const FEATURES = [
  { key: 'buildings' as const, icon: Building2 },
  { key: 'invoices' as const, icon: FileText },
  { key: 'accounting' as const, icon: BookOpen },
  { key: 'offline' as const, icon: WifiOff },
  { key: 'bilingual' as const, icon: Languages },
  { key: 'reports' as const, icon: BarChart3 },
];

const STATS = [
  { key: 'buildings' as const, icon: Building },
  { key: 'apartments' as const, icon: Home },
  { key: 'zatca' as const, icon: ShieldCheck },
  { key: 'pwa' as const, icon: Smartphone },
];

/* ═══════════════════════════════════════════════════════════════════ */
/*                       MAIN LANDING COMPONENT                       */
/* ═══════════════════════════════════════════════════════════════════ */
export function LandingContent() {
  const t = useTranslations('landing');
  const tLang = useTranslations('language');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const scrollRef = useScrollReveal();

  const toggleLocale = () => {
    const newLocale = locale === 'ar' ? 'en' : 'ar';
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    } catch {
      // localStorage may not be available
    }
    const pathWithoutLocale = pathname.replace(/^\/(ar|en)/, '') || '/';
    const newPath = newLocale === 'ar' ? pathWithoutLocale : `/en${pathWithoutLocale}`;
    router.push(newPath);
  };

  return (
    <div ref={scrollRef} className="relative min-h-screen overflow-hidden bg-background">
      {/* ─── Global landing styles ─── */}
      <style>{`
        .landing-reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .landing-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .landing-delay-1 { transition-delay: 100ms; }
        .landing-delay-2 { transition-delay: 200ms; }
        .landing-delay-3 { transition-delay: 300ms; }
        .landing-delay-4 { transition-delay: 400ms; }
        .landing-delay-5 { transition-delay: 500ms; }

        @keyframes float-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-float { animation: float-slow 6s ease-in-out infinite; }
        .animate-shimmer {
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }

        .hero-gradient {
          background: linear-gradient(
            135deg,
            oklch(0.96 0.02 80) 0%,
            oklch(0.98 0.01 60) 30%,
            oklch(1 0 0) 60%,
            oklch(0.97 0.015 170) 100%
          );
        }

        .feature-card {
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px -12px oklch(0.3 0.02 80 / 0.12);
        }

        .stat-card {
          position: relative;
          overflow: hidden;
        }
        .stat-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            oklch(0.85 0.06 80 / 0.08) 0%,
            transparent 50%
          );
          pointer-events: none;
        }
      `}</style>

      {/* ═══════════════════ HEADER / NAV ═══════════════════ */}
      <nav className="fixed inset-x-0 top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground transition-transform group-hover:scale-105">
              <Building2 className="h-5 w-5 text-background" />
            </div>
            <span className="text-lg font-bold tracking-tight">{t('title')}</span>
          </Link>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLocale}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Globe className="h-4 w-4" />
              <span className="text-sm">
                {locale === 'ar' ? tLang('switchToEnglish') : tLang('switchToArabic')}
              </span>
            </Button>
            <Button asChild size="sm">
              <Link href="/login">
                {t('loginButton')}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ═══════════════════ HERO SECTION ═══════════════════ */}
      <section className="hero-gradient relative flex min-h-[92vh] items-center pt-16">
        {/* Geometric accent - top end corner */}
        <div className="pointer-events-none absolute end-0 top-0 h-80 w-80 text-foreground/10">
          <GeometricPattern className="h-full w-full" />
        </div>
        {/* Geometric accent - bottom start corner */}
        <div className="pointer-events-none absolute bottom-0 start-0 h-64 w-64 text-foreground/5">
          <GeometricPattern className="h-full w-full" />
        </div>

        {/* Floating decorative shapes */}
        <div className="animate-float pointer-events-none absolute end-[12%] top-[28%] hidden h-16 w-16 rounded-2xl border border-foreground/10 bg-foreground/[0.03] md:block" />
        <div className="animate-float pointer-events-none absolute start-[8%] top-[60%] hidden h-10 w-10 rotate-45 rounded-lg border border-foreground/10 bg-foreground/[0.03] md:block" style={{ animationDelay: '2s' }} />

        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="max-w-2xl">
            {/* Tagline badge */}
            <div className="landing-reveal mb-6 inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/[0.04] px-4 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-foreground/70">
                {t('heroTagline')}
              </span>
            </div>

            {/* Main heading */}
            <h1 className="landing-reveal landing-delay-1 text-4xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl">
              {t('title')}
              <span className="block bg-gradient-to-l from-amber-600 via-amber-500 to-emerald-600 bg-clip-text text-transparent">
                {t('subtitle')}
              </span>
            </h1>

            {/* Description */}
            <p className="landing-reveal landing-delay-2 mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {t('heroDescription')}
            </p>

            {/* CTA buttons */}
            <div className="landing-reveal landing-delay-3 mt-10 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="h-12 gap-2 rounded-xl px-8 text-base font-semibold shadow-lg shadow-foreground/10">
                <Link href="/login">
                  {t('cta')}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 gap-2 rounded-xl px-8 text-base"
                asChild
              >
                <a href="https://wa.me/966543620486" target="_blank" rel="noopener noreferrer">
                  {t('contact')}
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute inset-x-0 bottom-8 flex justify-center">
          <ChevronDown className="h-5 w-5 animate-bounce text-muted-foreground/50" />
        </div>
      </section>

      {/* ═══════════════════ FEATURES SECTION ═══════════════════ */}
      <section className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="landing-reveal mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t('whyIjarPro')}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t('whyDescription')}
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.key}
                  className={`feature-card landing-reveal landing-delay-${Math.min(i + 1, 5)} group relative rounded-2xl border border-border/60 bg-card p-6`}
                >
                  {/* Icon */}
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-foreground/[0.06] transition-colors group-hover:bg-foreground/10">
                    <Icon className="h-5 w-5 text-foreground/70" />
                  </div>

                  <h3 className="text-base font-semibold leading-tight">
                    {t(`features.${feature.key}`)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(`features.${feature.key}Desc`)}
                  </p>

                  {/* Subtle corner decoration */}
                  <div className="pointer-events-none absolute end-4 top-4 h-8 w-8 rounded-sm border border-foreground/[0.04] opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════ STATS SECTION ═══════════════════ */}
      <section className="relative overflow-hidden border-y border-border/40 bg-foreground/[0.02] py-20 sm:py-24">
        {/* Background geometric overlay */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03]">
          <GeometricPattern className="h-[600px] w-[600px] text-foreground" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.key}
                  className={`stat-card landing-reveal landing-delay-${Math.min(i + 1, 4)} rounded-2xl border border-border/60 bg-card px-6 py-8 text-center`}
                >
                  <Icon className="mx-auto mb-3 h-7 w-7 text-foreground/50" />
                  <p className="text-lg font-bold">{t(`stats.${stat.key}`)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════ FINAL CTA SECTION ═══════════════════ */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="landing-reveal relative overflow-hidden rounded-3xl bg-foreground px-8 py-16 text-center text-background sm:px-16 sm:py-20">
            {/* Pattern overlay */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.04]">
              <GeometricPattern className="h-full w-full text-background" />
            </div>

            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {t('cta')}
              </h2>
              <p className="mx-auto mt-4 max-w-md text-base text-background/60">
                {t('heroDescription')}
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="h-12 gap-2 rounded-xl px-8 text-base font-semibold"
                >
                  <Link href="/login">
                    {t('loginButton')}
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 gap-2 rounded-xl border-background/20 bg-transparent px-8 text-base text-background hover:bg-background/10 hover:text-background"
                  asChild
                >
                  <a href="https://wa.me/966543620486" target="_blank" rel="noopener noreferrer">
                    {t('contact')}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="border-t border-border/40 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground">
              <Building2 className="h-3.5 w-3.5 text-background" />
            </div>
            <span className="text-sm font-semibold">{t('title')}</span>
          </div>

          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} {t('title')}. {t('footer.copyright')} — {t('footer.madeIn')}
          </p>
        </div>
      </footer>

      {/* WhatsApp FAB */}
      <WhatsAppFab />
    </div>
  );
}
