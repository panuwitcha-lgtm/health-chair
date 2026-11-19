import { demo } from './demo';
import { thingsboard } from './thingsboard';

// เลือกโหมดตามที่ผู้ใช้กดตอนเข้าสู่ระบบ (จำไว้ใน localStorage)
const KEY = 'hc_mode';
export function getMode() { try { return localStorage.getItem(KEY) || 'live'; } catch { return 'live'; } }
export function setMode(m) { try { localStorage.setItem(KEY, m); } catch { /* ไม่มี storage */ } }
export const api = () => (getMode() === 'demo' ? demo : thingsboard);
