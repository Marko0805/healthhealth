import { HABITS, DAYS, LEVELS, MAX_WEEKLY_XP, STORAGE_KEY } from './constants.js';

export function getLevel(xp) {
  let cur = LEVELS[0];
  for (const l of LEVELS) { if (xp >= l.min) cur = l; }
  return cur;
}
export function getNextLevel(xp) {
  for (const l of LEVELS) { if (xp < l.min) return l; }
  return null;
}
export function weekXP(checked) {
  return HABITS.reduce((acc,h) =>
    acc + DAYS.reduce((a,_,i) => a + (checked[`${h.id}-${i}`] ? h.xp : 0), 0), 0);
}
export function dayXP(checked, dIdx) {
  return HABITS.reduce((acc,h) => acc + (checked[`${h.id}-${dIdx}`] ? h.xp : 0), 0);
}
export function isDayDone(checked, dIdx) {
  return HABITS.every(h => checked[`${h.id}-${dIdx}`]);
}
export function completeDaysCount(checked) {
  return DAYS.filter((_,i) => isDayDone(checked, i)).length;
}
export function loadData() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
export function saveData(d) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {}
}
export function defaultData() {
  return {
    startDate: new Date().toISOString(),
    currentWeek: 1,
    totalStreak: 0,
    lifetimeXP: 0,
    history: {},
    checked: {},
  };
}
export function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'2-digit' });
}
export function randomItem(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
