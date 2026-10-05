import {setRequestLocale} from 'next-intl/server';
import {PollList} from '@/components/poll/poll-list';
export default async function Page({params}: {params: Promise<{locale: string}>}) {const {locale} = await params; setRequestLocale(locale); return <PollList/>;}
