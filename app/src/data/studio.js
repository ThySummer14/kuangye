import { STUDIO_DRAFTS } from './studio-drafts.js';
export const STUDIO_THEMES = [
  { id: 'notice', title: '把日常看仔细', medium: '观察与摄影', note: '把眼前略过的东西，留成一页。', color: 'var(--lake)' },
  { id: 'words', title: '让几句话成形', medium: '文字', note: '从几句具体的话，走到一个完整的小故事。', color: 'var(--moss)' },
  { id: 'lines', title: '用线条做一点东西', medium: '图形与手作', note: '用手边的工具，做出可以留下的一版。', color: 'var(--glow-deep)' },
];
// 新内容的发布入口明确分开；不能因为做了界面就把待审文案发布。
const APPROVED_EXERCISES = [];
export const STUDIO_EXERCISES = import.meta.env?.DEV ? STUDIO_DRAFTS : APPROVED_EXERCISES;
export const studioTheme = id => STUDIO_THEMES.find(theme => theme.id === id);
