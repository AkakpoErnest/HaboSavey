'use client';
import {useLocale} from 'next-intl';

/**
 * Kesennuma City's official mascot, Hoya Boya (海の子 ホヤぼーや).
 * Images: official downloads from the city site (manualvariation1-2.zip), resized only. Non-commercial web use needs no
 * application, but the design manual requires: no changes to colour/shape/pose/expression, no cropping, no text on top of
 * him, the credit line must always be shown, and animation/video needs prior approval. So the character itself is
 * NEVER animated here; only the speech bubble next to him is.
 * https://www.kesennuma.miyagi.jp/sec/s084/030/010/010/20160921145744.html
 */
export type HoyaPose = 'wave' | 'cheer' | 'surprised' | 'stand' | 'face';

/** Credit text exactly as the design manual specifies; shown as two centred lines like the manual's example. */
export const HOYA_CREDIT = {
  ja: ['気仙沼市観光キャラクター', '「海の子 ホヤぼーや」'],
  en: ['Kesennuma City Mascot,', 'Hoya Boya the Ocean Boy'],
} as const;

export function HoyaBoya({pose = 'wave', height = 140, say, className = ''}: {pose?: HoyaPose; height?: number; say?: string; className?: string}) {
  const locale = useLocale();
  const credit = locale === 'en' ? HOYA_CREDIT.en : HOYA_CREDIT.ja;
  const creditText = locale === 'en' ? credit.join(' ') : credit.join('');
  return (
    <figure className={`flex items-center gap-3 ${className}`}>
      <div className="flex shrink-0 flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/mascot/hoyaboya-${pose}.png`} alt={creditText} style={{height}} className="w-auto select-none" draggable={false}/>
        <figcaption className="mt-1 text-center text-[11px] leading-snug text-[#5b6b5c]">
          {credit.map((line) => <span key={line} className="block whitespace-nowrap">{line}</span>)}
        </figcaption>
      </div>
      {say && (
        <p className="cs-bubble relative min-w-0 max-w-[16rem] flex-1 rounded-2xl border border-[#dee2d6] bg-white px-4 py-3 text-base font-semibold leading-snug shadow-sm before:absolute before:-left-2 before:top-1/2 before:size-4 before:-translate-y-1/2 before:rotate-45 before:border-b before:border-l before:border-[#dee2d6] before:bg-white">
          {say}
        </p>
      )}
    </figure>
  );
}
