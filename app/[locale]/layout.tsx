import type {Metadata} from 'next';
import {NextIntlClientProvider, hasLocale} from 'next-intl';
import {setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {routing} from '@/lib/i18n/routing';
import '../globals.css';
export const metadata:Metadata={title:'HaboSavey | 気仙沼の明日を、いっしょに。',description:'Imagine a better Kesennuma. Share ideas for our town and take part in local surveys.'};
export function generateStaticParams(){return routing.locales.map(locale=>({locale}));}
export default async function LocaleLayout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}) {const {locale}=await params;if(!hasLocale(routing.locales,locale))notFound();setRequestLocale(locale);return <html lang={locale}><body><NextIntlClientProvider>{children}</NextIntlClientProvider></body></html>;}
