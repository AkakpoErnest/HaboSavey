import {setRequestLocale} from 'next-intl/server';
import {PollResultsLive} from '@/components/poll/poll-results-live';
export default async function Page({params}: {params: Promise<{locale: string}>}) {const {locale} = await params; setRequestLocale(locale); return <PollResultsLive id="current"/>;}
