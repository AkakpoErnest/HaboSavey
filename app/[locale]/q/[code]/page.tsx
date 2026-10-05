import {setRequestLocale} from 'next-intl/server';
import {QrLanding} from '@/components/poll/qr-landing';
export default async function Page({params}: {params: Promise<{locale: string; code: string}>}) {const {locale, code} = await params; setRequestLocale(locale); return <QrLanding code={code}/>;}
