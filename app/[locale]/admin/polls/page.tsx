import {setRequestLocale} from 'next-intl/server';
import {AdminPolls} from '@/components/admin/admin-polls';
export default async function Page({params}: {params: Promise<{locale: string}>}) {const {locale} = await params; setRequestLocale(locale); return <AdminPolls/>;}
