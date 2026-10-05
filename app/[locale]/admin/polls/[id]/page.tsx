import {setRequestLocale} from 'next-intl/server';
import {AdminPollDetail} from '@/components/admin/admin-poll-detail';
export default async function Page({params}: {params: Promise<{locale: string; id: string}>}) {const {locale, id} = await params; setRequestLocale(locale); return <AdminPollDetail id={id}/>;}
