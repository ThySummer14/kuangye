import { RESIDENT_DRAFTS } from './resident-drafts.js';
const APPROVED_RESIDENT_VISITS = [];
export const RESIDENT_VISITS = import.meta.env?.DEV ? RESIDENT_DRAFTS : APPROVED_RESIDENT_VISITS;
