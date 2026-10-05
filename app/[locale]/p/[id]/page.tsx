import {setRequestLocale} from 'next-intl/server';
import {PollVote} from '@/components/poll/poll-vote';
export default async function Page({params, searchParams}: {params: Promise<{locale: string; id: string}>; searchParams: Promise<{via?: string}>}) {
  const {locale, id} = await params; const {via} = await searchParams; setRequestLocale(locale);
  return <PollVote id={id} via={via}/>;
}
