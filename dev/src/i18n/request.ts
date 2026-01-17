import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';

const SUPPORTED_LOCALES = ['zh-CN', 'en'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const DEFAULT_LOCALE: SupportedLocale = 'zh-CN';

function detectLocaleFromAcceptLanguage(headerValue: string | null): SupportedLocale | null {
  if (!headerValue) return null;

  const lower = headerValue.toLowerCase();
  if (lower.includes('zh')) return 'zh-CN';
  if (lower.includes('en')) return 'en';

  return null;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();

  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value ?? null;
  const headerLocale = detectLocaleFromAcceptLanguage((await headers()).get('accept-language'));

  const requested = localeCookie ?? headerLocale;
  let locale: SupportedLocale = DEFAULT_LOCALE;
  if (requested && hasLocale(SUPPORTED_LOCALES, requested)) {
    locale = requested;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
