// Local procedural artwork: no remote texture, bitmap, font or model dependency.
import { ETCHING_ART } from '../data/etching-art.js';
const path = (d, fill='url(#wood)', stroke='#685442', width=2) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const line = (d, color='#695845', width=2) => path(d,'none',color,width);
const ellipse = (x,y,rx,ry,fill='url(#wood)',stroke='#695845') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
const leaf=(x,y,r=0,color='url(#wood)')=>`<g transform="translate(${x} ${y}) rotate(${r})">${path('M0 0 Q-21 -13 0 -39 Q21 -13 0 0',color)}${line('M0 -3 V-31 M0 -15 L-7 -22 M0 -22 L6 -28','#756143',1)}</g>`;
const pine=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})">${path('M0 -29 L-11 -9 L-5 -9 L-15 4 L-5 4 L-18 16 L18 16 L5 4 L15 4 L5 -9 L11 -9 Z','url(#moss)')}${line('M0 -13 V24','#665844',3)}</g>`;

function motif(id,rank){
 const mid=rank>1, end=rank===3, gold=end?'#c7a568':'#aa9d83';
 switch(id){
 case 'season-lantern': {
  let s=line('M101 49 V37 Q128 18 155 37 V49','#76634c',7)+path('M77 60 Q66 64 66 83 V190 Q66 202 82 206 H174 Q190 202 190 187 V81 Q190 64 175 60 Z');
  s+=path('M77 51 H179 L187 62 H68 Z')+path('M86 207 H171 L164 218 H92 Z');
  if(!mid)return s+leaf(129,160,26,'#786744');
  s+=path('M79 78 H177 V190 H79 Z','#ece6d5')+line('M128 79 V190','#8c744d',5);
  s+=leaf(105,119,-30)+leaf(151,121,28)+leaf(105,179,-30);
  if(end)s+=leaf(152,179,28,'#b49a63')+line('M80 194 H177 M76 65 H181',gold,4);
  else s+=line('M173 153 v7 M173 179 v7','#b1a58c',3);
  return s;
 }
 case 'ridge-bridge': {
  let s=path('M30 202 L31 180 L51 153 L72 149 L86 117 L104 95 L118 61 L139 55 L159 89 L175 96 L187 128 L216 164 L226 202 Z','url(#stone)');
  if(mid)s=path('M28 200 L39 159 Q62 113 114 103 L115 127 Q78 139 79 197 Z','url(#stone)')+path('M142 103 Q194 113 218 166 L226 202 H177 Q177 145 141 126 Z','url(#stone)');
  else s+=path('M83 200 V170 Q88 115 130 115 Q171 116 175 173 V201 Z','#e8e1d1');
  for(let i=0;i<5;i++)s+=path(`M${38+i*10} ${191-i*15} h27 v9 h-27 Z`,'#c3b8a3');
  if(mid){s+=line('M161 132 l13 -16 M180 151 l17 -8 M186 178 l24 -3','#766c58');s+=line('M47 149 V126 M66 128 V111 M194 141 V121','#7a705c',6);}
  if(end)s+=path('M113 103 Q128 96 143 103 L140 129 H116 Z',gold)+line('M100 103 Q128 83 158 104','#9a8a6b',6)+pine(200,188,.4);
  return s;
 }
 case 'first-door': {
  let s=path('M66 218 V73 L128 30 L190 73 V218 Z')+path('M78 205 V81 L128 48 L178 81 V205 Z','#75644e')+path('M90 198 V89 L128 64 L166 89 V198 Z',end?'#e9d7a4':'#c1a77c');
  if(!mid)return s+line('M128 85 V186','#e7ce91',5);
  if(!end)s+=path('M91 87 L116 98 V194 L91 199 Z')+path('M144 99 L165 86 V200 L144 193 Z');
  else{for(let i=0;i<7;i++){const a=Math.PI+i/6*Math.PI;s+=line(`M${128+Math.cos(a)*25} ${95+Math.sin(a)*20} L${128+Math.cos(a)*43} ${95+Math.sin(a)*37}`,gold,3);}s+=leaf(98,192,-22,'#819073')+leaf(157,192,22,'#87906e');}
  for(let i=0;i<3;i++)s+=path(`M${89-i*4} ${191+i*6} H${167+i*4} v5 H${89-i*4} Z`,'#b29a75');return s;
 }
 case 'water-bay': {
  let s=path('M128 30 C106 74 51 113 48 156 C39 222 213 237 210 161 C209 112 151 72 128 30 Z','url(#stone)');
  s+=path(mid?'M126 71 Q89 103 142 115 Q180 126 123 146 Q85 164 171 185 Q142 204 81 189 Q64 174 89 160 Q112 152 109 143 Q63 124 117 104 Q153 91 126 71 Z':'M65 157 Q108 139 128 159 Q113 174 175 177 Q133 194 98 177 Q147 165 65 157 Z',end?'#849a98':'#bbb29d');
  if(mid)s+=path('M66 131 l12 -34 l18 34 Z','#817e67')+line('M92 96 l20 -22 l16 7 l14 -13 l23 28','#817e6b',3);
  if(end){s+=line('M68 183 Q126 220 191 178',gold,4);for(let i=0;i<4;i++)s+=line(`M${116-i*4} ${169+i*6} h${35+i*3}`,'#c9d4cb',1.5);}return s;
 }
 case 'woven-paths': {
  let s=''; const strips=mid?[['M126 35 L152 54 L88 183 L64 163 Z'],['M51 117 L68 91 L198 144 L181 169 Z']]:[['M126 37 L148 59 L59 148 L37 126 Z'],['M108 56 L130 34 L220 124 L198 146 Z'],['M36 126 L58 104 L150 196 L128 219 Z'],['M127 218 L105 195 L197 103 L220 126 Z']];
  for(const [d] of strips)s+=path(d);
  if(mid){s+=path(end?'M178 72 L202 92 L126 213 L102 193 Z':'M178 72 L202 92 L161 152 L134 136 Z');s+=path('M67 158 Q121 163 161 113 L178 130 Q127 191 80 181 Z',end?'#82978a':'url(#wood)');s+=path('M113 77 Q111 124 163 143 L154 163 Q92 141 91 88 Z');}
  if(end)s+=line('M120 46 L144 62 M181 151 L169 172 M99 186 L113 199',gold,3);return s;
 }
 case 'forest-trail': {
  let s=path('M45 189 L33 165 L43 133 L35 113 L66 87 L63 65 L101 59 L116 37 L151 44 L194 25 L207 76 L220 91 L206 121 L216 145 L196 181 L158 199 L121 202 L74 224 L73 201 Z');
  s+=path('M78 193 Q170 156 111 145 Q70 126 154 101 Q192 83 165 68 Q210 87 170 111 Q137 130 167 144 Q197 170 102 207 Z',end?'#cabc91':'#cab996');
  if(mid)s+=line('M65 115 L94 70 L112 93 L136 60 L160 81','#8d8064',5)+pine(68,143,.8)+pine(185,119,.6);
  if(end)s+=pine(171,180,.65)+leaf(188,181,38,'#8c9a70')+path('M162 76 V58 H168 V77 Z',gold);return s;
 }
 case 'carved-vessel': {
  let s=path('M204 107 C231 174 186 219 121 219 C46 219 28 157 53 97 C75 44 151 24 177 49 C198 70 130 106 143 75 C114 57 91 91 80 121 C56 180 120 196 160 172 C190 150 178 125 204 107 Z');
  s+=line('M185 112 Q187 156 154 173 M66 165 Q52 99 111 65 Q155 39 165 58','#d2bd97',3);
  if(!mid)return s+ellipse(128,152,43,8,'#8d7859');
  s+=path('M85 143 Q85 195 134 199 Q179 195 183 143 Z','url(#wood)')+ellipse(134,143,49,12,'#9c8057');
  s+=line('M93 161 Q137 178 176 161 M102 179 Q135 191 166 180','#d2b98e',2);
  if(!end)s+=path('M128 130 H143 V159 H128 Z','#efe8d9','#efe8d9',0);
  else s+=line('M142 151 l-5 12 l5 8 l-6 12 l3 10',gold,4);return s;
 }
 case 'lake-echo': {
  let s=ellipse(128,137,99,78,'url(#stone)');
  s+=path(end?'M114 90 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0':'M108 92 Q128 64 149 92 Q129 78 108 92 Z',end?'#d5c397':'#7c786a');
  for(let i=0;i<(mid?4:2);i++)s+=ellipse(128,155,24+i*18,5+i*6,'none',i===0&&end?'#bdc9be':'#797668');
  if(mid)s+=path('M113 166 Q128 188 145 166 L143 183 Q129 200 115 183 Z',end?'#a4b7b4':'#a09c8a');
  if(end)s+=line('M117 180 h24 M119 185 h19','#e0ddc5',2);return s;
 }
 }
}
export function etchingSvg(id,rank=1){
 if(!ETCHING_ART.some(a=>a.id===id))throw new Error('Unknown etching artwork');
 if(![1,2,3].includes(rank))throw new Error('Unknown etching tier');
 const drawing=motif(id,rank);
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img"><defs><linearGradient id="wood" x2=".8" y2="1"><stop stop-color="#d3bd94"/><stop offset=".45" stop-color="#bca079"/><stop offset="1" stop-color="#917959"/></linearGradient><linearGradient id="stone" x2=".3" y2="1"><stop stop-color="#cec5b0"/><stop offset="1" stop-color="#9a947f"/></linearGradient><linearGradient id="moss"><stop stop-color="#889071"/><stop offset="1" stop-color="#636d53"/></linearGradient><filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="5" stdDeviation="3" flood-color="#544631" flood-opacity=".22"/></filter></defs><g filter="url(#shadow)">${drawing}</g></svg>`;
}
export function etchingImage(id,rank){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(etchingSvg(id,rank));}
