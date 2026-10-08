import {setRequestLocale} from 'next-intl/server';
import {BonitoJump} from '@/components/play/bonito-jump';
export default async function Page({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  return <BonitoJump/>;
}
