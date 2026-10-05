import type {Metadata} from 'next';
import {NextIntlClientProvider, hasLocale} from 'next-intl';
import {setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {routing} from '@/lib/i18n/routing';
import '../globals.css';
export const metadata:Metadata={title:'Citizen Sentiment | 気仙沼 市民の声',description:'Kesennuma city plans, your choice. Scan, compare A and B, and tell the city what you prefer.'};
export function generateStaticParams(){return routing.locales.map(locale=>({locale}));}
export default async function LocaleLayout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}) {const {locale}=await params;if(!hasLocale(routing.locales,locale))notFound();setRequestLocale(locale);return <html lang={locale}><body><NextIntlClientProvider>{children}</NextIntlClientProvider></body></html>;}
