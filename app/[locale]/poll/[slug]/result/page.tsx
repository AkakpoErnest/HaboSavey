import {setRequestLocale} from 'next-intl/server';
import {PollResultsLive} from '@/components/poll/poll-results-live';
export default async function Page({params}: {params: Promise<{locale: string; slug: string}>}) {const {locale, slug} = await params; setRequestLocale(locale); return <PollResultsLive id={slug}/>;}
