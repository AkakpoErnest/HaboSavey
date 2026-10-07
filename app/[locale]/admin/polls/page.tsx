import {setRequestLocale} from 'next-intl/server';
import {redirect} from 'next/navigation';
import {getCurrentUser, isStaff} from '@/lib/auth';
import {AdminPolls} from '@/components/admin/admin-polls';
export default async function Page({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  if (!isStaff(await getCurrentUser())) redirect(`/${locale}/imagine`);
  return <AdminPolls/>;
}
