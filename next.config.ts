import createNextIntlPlugin from 'next-intl/plugin';
export default createNextIntlPlugin('./lib/i18n/request.ts')({outputFileTracingRoot: process.cwd()});
