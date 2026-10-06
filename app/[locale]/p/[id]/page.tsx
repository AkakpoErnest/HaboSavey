import {redirect} from 'next/navigation';
/** Old /p/<id> links (and printed QR codes) now live at /poll/<id>, which then shows the poll's slug URL. */
export default async function Page({params, searchParams}: {params: Promise<{locale: string; id: string}>; searchParams: Promise<{via?: string}>}) {
  const {locale, id} = await params; const {via} = await searchParams;
  redirect(`/${locale}/poll/${id}${via ? `?via=${encodeURIComponent(via)}` : ''}`);
}
