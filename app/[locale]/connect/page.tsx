import {Suspense} from 'react';
import {setRequestLocale} from 'next-intl/server';
import {ConnectGame} from '@/components/connect/connect-game';
export default async function Page({params}: {params: Promise<{locale: string}>}) {const {locale} = await params; setRequestLocale(locale); return <Suspense><ConnectGame/></Suspense>;}
