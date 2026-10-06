import {setRequestLocale} from 'next-intl/server';
import {PollVote} from '@/components/poll/poll-vote';
/** /[locale]/poll: the featured poll (what flyer QR codes point to). */
export default async function Page({params, searchParams}: {params: Promise<{locale: string}>; searchParams: Promise<{via?: string}>}) {
  const {locale} = await params; const {via} = await searchParams; setRequestLocale(locale);
  return <PollVote id="current" via={via}/>;
}
