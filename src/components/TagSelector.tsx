// src/components/TagSelector.tsx
import { useEffect, useState } from 'react';
import axios from 'axios';


type Props={ value:string[]; onChange:(v:string[])=>void };
export default function TagSelector({ value, onChange }:Props){
const [all,setAll]=useState<{id:number;name:string}[]>([]);
const [input,setInput]=useState('');
useEffect(()=>{(async()=>{ const {data}=await axios.get('/api/tags'); setAll(data); })();},[]);
const addTag=(t:string)=>{ if(!t) return; if(!value.includes(t)) onChange([...value,t]); setInput(''); };
return (
<div className="flex items-center gap-2 flex-wrap">
{value.map(t=> (
<span key={t} className="px-2 py-1 bg-gray-200 rounded">#{t}
<button onClick={()=>onChange(value.filter(v=>v!==t))} className="ml-1">✕</button>
</span>
))}
<input list="taglist" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'){ addTag(input.trim()); } }} className="border px-2 py-1 rounded" placeholder="태그 입력" />
<datalist id="taglist">
{all.map(t=> <option key={t.id} value={t.name} />)}
</datalist>
<button onClick={()=>addTag(input.trim())} className="px-2 py-1 border rounded">추가</button>
</div>
)
}