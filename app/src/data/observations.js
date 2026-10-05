import { OBSERVATION_DRAFTS } from './observation-drafts.js';
export const OBSERVATION_KINDS = [
  { id:'plant', name:'花草与树木' }, { id:'sky', name:'天空与光' },
  { id:'street', name:'路边与声音' }, { id:'other', name:'其他发现' },
];
const APPROVED_PROMPTS=[];
export const OBSERVATION_PROMPTS = import.meta.env?.DEV ? OBSERVATION_DRAFTS : APPROVED_PROMPTS;
export const observationKind = id => OBSERVATION_KINDS.find(kind=>kind.id===id);
