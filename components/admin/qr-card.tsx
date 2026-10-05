'use client';
import {useEffect, useState} from 'react';
import QRCode from 'qrcode';
import {Download, Printer} from 'lucide-react';
import type {QrCodeInfo} from '@/lib/schemas';
import {useL} from '@/components/poll/shared';

/** A printable QR code with PNG/SVG download. */
export function QrCard({qr, title}: {qr: QrCodeInfo; title?: string}) {
  const {L} = useL();
  const [png, setPng] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    const opts = {margin: 2, errorCorrectionLevel: 'M' as const, color: {dark: '#16392f', light: '#ffffff'}};
    QRCode.toDataURL(qr.url, {...opts, width: 1024}).then(setPng);
    QRCode.toString(qr.url, {...opts, type: 'svg'}).then((s) => setSvg(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`));
  }, [qr.url]);

  function print() {
    const w = window.open('', '_blank', 'width=600,height=800');
    if (!w || !png) return;
    w.document.write(`<html><head><title>QR</title></head><body style="font-family:sans-serif;text-align:center;padding:40px">
      <h1 style="font-size:28px">${(title ?? qr.label).replace(/</g, '&lt;')}</h1>
      <img src="${png}" style="width:360px;height:360px"/><p style="font-size:18px">${L('スマホのカメラで読み取って投票', 'Scan with your phone camera to vote')}</p>
      <p style="font-size:12px;color:#555">${qr.url}</p><script>onload=()=>print()</script></body></html>`);
    w.document.close();
  }

  return (
    <div className="flex gap-4 rounded-xl border border-[#dee2d6] bg-white p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {png ? <img src={png} alt={`QR: ${qr.url}`} className="size-28 shrink-0 rounded"/> : <div className="size-28 shrink-0 animate-pulse rounded bg-[#e4e8dc]"/>}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-semibold leading-snug">{qr.label}</p>
        <p className="truncate text-sm text-[#5b6b5c]">{qr.url}</p>
        <p className="text-sm text-[#5b6b5c]">{L(`読み取り ${qr.scanCount} 回`, `${qr.scanCount} scans`)}{qr.active ? '' : L(' · 停止中', ' · inactive')}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm font-semibold">
          {png && <a className="inline-flex min-h-11 items-center gap-1 underline-offset-4 hover:underline" href={png} download={`qr-${qr.code}.png`}><Download size={16}/>PNG</a>}
          {svg && <a className="inline-flex min-h-11 items-center gap-1 underline-offset-4 hover:underline" href={svg} download={`qr-${qr.code}.svg`}><Download size={16}/>SVG</a>}
          <button className="inline-flex min-h-11 items-center gap-1 underline-offset-4 hover:underline" onClick={print}><Printer size={16}/>{L('印刷', 'Print')}</button>
        </div>
      </div>
    </div>
  );
}
