import type {Metadata} from 'next';
import {NextIntlClientProvider, hasLocale} from 'next-intl';
import {setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {routing} from '@/lib/i18n/routing';
import '../globals.css';
const SITE=process.env.APP_URL||process.env.URL||'http://localhost:3000';
export const metadata:Metadata={
  metadataBase:new URL(SITE),
  title:'Citizen Sentiment | 気仙沼 市民の声',
  description:'Kesennuma city plans, your choice. Scan, compare A and B, and tell the city what you prefer.',
  applicationName:'Citizen Sentiment',
  openGraph:{type:'website',siteName:'Citizen Sentiment',title:'Citizen Sentiment | 気仙沼 市民の声',description:'まちの計画、AとBどっちがいい？スマホで投票。登録不要。',images:[{url:'/images/og-share.jpg',width:1200,height:630,alt:'Kesennuma bay at dusk'}]},
  twitter:{card:'summary_large_image',title:'Citizen Sentiment | 気仙沼 市民の声',description:'Kesennuma city plans, your choice.',images:['/images/og-share.jpg']},
};
export function generateStaticParams(){return routing.locales.map(locale=>({locale}));}
export default async function LocaleLayout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}) {const {locale}=await params;if(!hasLocale(routing.locales,locale))notFound();setRequestLocale(locale);return <html lang={locale}><body><NextIntlClientProvider>{children}</NextIntlClientProvider></body></html>;}
