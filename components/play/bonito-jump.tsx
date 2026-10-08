'use client';
import {useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {AppShell, api, useL} from '@/components/poll/shared';
import {announcePoints} from '@/components/points/feedback';
import {Button} from '@/components/ui/button';
import type {PlayStartResponse, PlayFinishResponse} from '@/lib/schemas/play';

type Platform = {x:number; y:number; w:number};
type Coin = {x:number; y:number; taken:boolean};
type World = {y:number; vy:number; grounded:boolean; distance:number; time:number; collected:number; platforms:Platform[]; coins:Coin[]; next:number};
const fresh = ():World => ({y:260,vy:0,grounded:true,distance:0,time:0,collected:0,platforms:[{x:0,y:290,w:900}],coins:[{x:350,y:250,taken:false},{x:600,y:250,taken:false}],next:900});

export function BonitoJump() {
  const {locale,L} = useL();
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<World>(fresh());
  const round = useRef<PlayStartResponse|null>(null);
  const phaseRef = useRef('ready');
  const [phase,setPhase] = useState('ready');
  const [hud,setHud] = useState({seconds:0,fish:0});
  const [result,setResult] = useState<PlayFinishResponse|null>(null);
  const [error,setError] = useState('');
  const change = (value:string) => {phaseRef.current=value;setPhase(value);};
  const jump = () => {
    if(phaseRef.current==='playing' && world.current.grounded){world.current.vy=-480;world.current.grounded=false;}
  };
  async function start(){
    change('starting');setError('');setResult(null);
    try{round.current=await api<PlayStartResponse>('/api/play/rounds',{method:'POST'});world.current=fresh();setHud({seconds:0,fish:0});change('playing');canvas.current?.focus();}
    catch(e){setError((e as Error).message);change('ready');}
  }
  async function finish(){
    if(!round.current || phaseRef.current==='saving' || phaseRef.current==='done')return;
    change('saving');setError('');
    try{
      const r=await api<PlayFinishResponse>(`/api/play/rounds/${round.current.roundId}/finish`,{method:'POST',json:{bonitos:world.current.collected,distance:Math.floor(world.current.distance)}});
      setResult(r);if(r.pointsAwarded>0)announcePoints(r.pointsAwarded);change('done');
    }catch(e){setError((e as Error).message);change('retry');}
  }
  const finishRef=useRef(finish);finishRef.current=finish;
  useEffect(()=>{
    let frame=0,previous=0,lastHud=0;
    const draw=(now:number)=>{
      const dt=Math.min((now-previous)/1000||0,1/30);previous=now;
      const w=world.current;
      if(phaseRef.current==='playing'){
        w.time+=dt;w.distance+=Math.min(150+w.time*1.2,230)*dt;
        while(w.next<w.distance+900){
          const index=Math.floor(w.next/400);const y= index%3===0?255:290;
          const width=310;const x=w.next+65;
          w.platforms.push({x,y,w:width});w.coins.push({x:x+150,y:y-40,taken:false});w.next=x+width;
        }
        const oldBottom=w.y+30;w.vy+=1200*dt;w.y+=w.vy*dt;w.grounded=false;
        const px=w.distance+120;
        for(const p of w.platforms){if(px+34>p.x && px<p.x+p.w && w.vy>=0 && oldBottom<=p.y+2 && w.y+30>=p.y){w.y=p.y-30;w.vy=0;w.grounded=true;}}
        for(const c of w.coins){if(!c.taken && Math.abs(c.x-(px+17))<30 && Math.abs(c.y-(w.y+15))<38){c.taken=true;w.collected++;}}
        w.platforms=w.platforms.filter(p=>p.x+p.w>w.distance-100);w.coins=w.coins.filter(c=>c.x>w.distance-100);
        if(now-lastHud>150){setHud({seconds:Math.floor(w.time),fish:w.collected});lastHud=now;}
        if(w.y>390 || w.time>=60){setHud({seconds:Math.floor(w.time),fish:w.collected});void finishRef.current();}
      }
      const ctx=canvas.current?.getContext('2d');
      if(ctx){
        ctx.clearRect(0,0,720,360);ctx.fillStyle='#e4f0e8';ctx.fillRect(0,0,720,360);
        ctx.fillStyle='#f2c77c';ctx.beginPath();ctx.arc(585,70,32,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#bbd2c3';ctx.beginPath();ctx.moveTo(0,210);ctx.lineTo(120,100);ctx.lineTo(220,180);ctx.lineTo(360,85);ctx.lineTo(540,200);ctx.lineTo(720,125);ctx.lineTo(720,360);ctx.lineTo(0,360);ctx.fill();
        ctx.fillStyle='#7bb0ad';ctx.fillRect(0,305,720,55);
        ctx.strokeStyle='#d7e7dd';ctx.lineWidth=2;for(let i=0;i<12;i++){const x=i*75-(w.distance*.2%75);ctx.beginPath();ctx.moveTo(x,325);ctx.lineTo(x+35,325);ctx.stroke();}
        for(const p of w.platforms){ctx.fillStyle='#bf9365';ctx.fillRect(p.x-w.distance,p.y,p.w,70);ctx.fillStyle='#446d59';ctx.fillRect(p.x-w.distance,p.y,p.w,9);}
        const fish=(x:number,y:number,size:number,color:string)=>{ctx.save();ctx.translate(x,y);ctx.scale(size,size);ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(0,0,18,10,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(-14,0);ctx.lineTo(-26,-11);ctx.lineTo(-26,11);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(10,-3,3,0,Math.PI*2);ctx.fill();ctx.restore();};
        for(const c of w.coins)if(!c.taken){ctx.fillStyle='#fff2d1';ctx.beginPath();ctx.arc(c.x-w.distance,c.y,21,0,Math.PI*2);ctx.fill();fish(c.x-w.distance,c.y,.65,'#c87347');}
        fish(137,w.y+15,1.15,'#214e43');
      }
      frame=requestAnimationFrame(draw);
    };
    frame=requestAnimationFrame(draw);
    const hide=()=>{if(document.hidden && phaseRef.current==='playing')change('paused');};
    document.addEventListener('visibilitychange',hide);
    return()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',hide);};
  },[]);

  return <AppShell><section className="space-y-5 py-6">
    <div><p className="text-sm font-bold tracking-widest text-[#b86742]">KESENNUMA ARCADE</p><h1 className="mt-2 text-3xl font-black">{L('カツオジャンプ','Bonito Jump')}</h1><p className="mt-3 text-base">{L('タップ・スペースキーでジャンプ。足場を渡ってカツオを集めよう！','Tap or press Space to jump across platforms and collect bonito!')}</p></div>
    <div className="flex flex-wrap justify-between gap-3 rounded-2xl bg-[#e9ede3] p-4 font-bold"><span>{hud.seconds}s / 60s</span><span>{L('カツオ','Bonito')}: {hud.fish}</span><span>{L('20秒＋3匹で2pt・1日10ptまで','20 seconds + 3 bonito = 2 pt · max 10 pt/day')}</span></div>
    <canvas ref={canvas} width={720} height={360} tabIndex={0} aria-label={L('ジャンプゲーム。スペースか上矢印でジャンプ。','Jump game. Press Space or Arrow Up to jump.')} className="w-full rounded-2xl border-2 border-[#214e43] bg-[#e4f0e8] touch-manipulation" onPointerDown={(e)=>{e.preventDefault();canvas.current?.focus();jump();}} onKeyDown={(e)=>{if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();if(!e.repeat)jump();}}}/>
    <div className="flex flex-wrap gap-3">
      {(phase==='ready'||phase==='done') && <Button onClick={start}>{L('ゲームを始める','Start round')}</Button>}
      {phase==='starting' && <p role="status">{L('準備中…','Starting…')}</p>}
      {phase==='playing' && <><Button onPointerDown={(e)=>{if(e.pointerType!=='mouse'){e.preventDefault();jump();}}} onClick={jump}>{L('ジャンプ','Jump')}</Button><Button variant="outline" onClick={()=>change('paused')}>{L('一時停止','Pause')}</Button><Button variant="outline" onClick={()=>void finish()}>{L('終了','Finish round')}</Button></>}
      {phase==='paused' && <Button onClick={()=>{change('playing');canvas.current?.focus();}}>{L('再開','Resume')}</Button>}
      {phase==='saving' && <p role="status">{L('ポイントを確認中…','Checking your reward…')}</p>}
      {phase==='retry' && <Button onClick={()=>void finish()}>{L('結果の送信を再試行','Retry saving result')}</Button>}
    </div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {result && <div role="status" className="rounded-2xl bg-[#fff1d8] p-5"><h2 className="text-xl font-bold">{result.pointsAwarded>0?L(`${result.pointsAwarded}ポイント獲得！`,`You earned ${result.pointsAwarded} points!`):L('おつかれさま！','Nice round!')}</h2><p className="mt-2">{result.reason==='daily_cap'?L('今日のゲームポイントは上限に達しました。','You have reached today’s game reward limit.'):result.pointsAwarded===0?L('20秒以上生き残り、カツオを3匹集めるとポイントがもらえます。','Survive at least 20 seconds and collect 3 bonito to qualify for points.'):L(`今日の獲得：${result.earnedToday}/${result.dailyCap}pt`,`Earned today: ${result.earnedToday}/${result.dailyCap} pt`)}</p><Link className="mt-3 inline-block font-bold underline" href={`/${locale}/imagine`}>{L('ポイントで写真のアイデアを作る','Use points to imagine a better place')}</Link></div>}
    <p className="text-sm text-[#5b6b5c]">{L('登録不要。ゲストでも遊べます。カツオはこのゲーム専用のオリジナルキャラクターです。','No sign-up needed—guests can play. The bonito is an original character made for this game.')}</p>
  </section></AppShell>;
}
