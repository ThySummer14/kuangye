import { LIFETIME_MEDALS } from './lifetime-challenges.js';
export const MEDAL_ASSETS = Object.fromEntries([
  ...['breach','resolve','versatile','summit'].map((id,i)=>[id,{ordinal:i+1,series:'CH',artwork:'challenger/engraving-atlas.png',thumbnail:`challenger/${id}.png`}]),
  ...LIFETIME_MEDALS.map(m=>[m.id,{ordinal:m.ordinal,series:'LC',artwork:`challenger/lifetime/${m.id}.png`,thumbnail:`challenger/lifetime/${m.id}.webp`}]),
]);
