import { mkdirSync, writeFileSync } from 'node:fs';
import { ETCHING_ART } from '../app/src/data/etching-art.js';
import { ETCHING_TIERS } from '../app/src/data/etchings.js';
import { etchingSvg } from '../app/src/art/etching-svg.js';
const root=new URL('../output/etchings/',import.meta.url);mkdirSync(root,{recursive:true});
for(const art of ETCHING_ART)for(const tier of ETCHING_TIERS)
 writeFileSync(new URL(`${art.number}-${tier.id}.svg`,root),etchingSvg(art.id,tier.rank));
console.log('Exported 24 local procedural SVG medallions to output/etchings/.');
