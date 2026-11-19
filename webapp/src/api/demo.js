// โหมดเดโม: จำลองเก้าอี้และข้อมูลย้อนหลัง ใช้นำเสนอได้โดยไม่ต้องมีฮาร์ดแวร์
import { DEFAULTS } from '../config';
import { startOfDay } from '../lib/format';
import { toSegments, toSessions } from '../lib/stats';

const DEVICE = { id: 'demo-chair-0001', name: 'Health Chair #1', label: 'เก้าอี้ห้องทำงาน', type: 'health-chair' };
const USER = { id: 'demo', email: 'demo@healthchair.app', firstName: 'ผู้ใช้', lastName: 'ทดลอง', name: 'ผู้ใช้ ทดลอง', authority: 'CUSTOMER_USER' };
const MIN = 60000;

function rng(seed) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function pick(r, weights) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let x = r() * total;
  for (const k in weights) { x -= weights[k]; if (x <= 0) return k; }
  return Object.keys(weights)[0];
}
const weightsFor = (good) => ({ upright: good, lean_forward: 0.16, lean_back: 0.08, lean_left: 0.05, lean_right: 0.05, perch: 0.05 });

// สร้างข้อมูลการนั่งของ 1 วัน (ยิ่งใกล้วันนี้ยิ่งนั่งถูกท่ามากขึ้น ให้เห็นแนวโน้ม)
function genDay(dayStart, untilTs) {
  const d = new Date(dayStart);
  const r = rng(d.getFullYear() * 1000 + d.getMonth() * 40 + d.getDate());
  const daysAgo = Math.round((startOfDay().getTime() - dayStart) / 86400000);
  const good = 0.42 + Math.max(0, 30 - daysAgo) * 0.012;
  const weekend = d.getDay() === 0 || d.getDay() === 6;
  const pts = [];
  let t = dayStart + (weekend ? 13 * 60 : 8 * 60 + 30) * MIN + r() * 50 * MIN;
  const end = dayStart + (weekend ? 15.5 * 60 : 17.5 * 60) * MIN + r() * 60 * MIN;
  const lunch = [dayStart + 12 * 60 * MIN, dayStart + 13 * 60 * MIN];
  while (t < end && t < untilTs) {
    const sessEnd = Math.min(end, t + (20 + r() * 32) * MIN, untilTs);
    while (t < sessEnd) {
      if (t >= lunch[0] && t < lunch[1]) break;
      const p = pick(r, weightsFor(good));
      const hold = Math.min(sessEnd, t + (1 + r() * 7) * MIN);
      for (let x = t; x < hold; x += MIN) pts.push({ ts: Math.round(x), v: p });
      t = hold;
    }
    if (t < untilTs) pts.push({ ts: Math.round(t), v: 'empty' });
    t = t >= lunch[0] && t < lunch[1] ? lunch[1] + r() * 10 * MIN : t + (3 + r() * 12) * MIN;
  }
  return pts;
}

// ---------- เก้าอี้จำลองแบบเรียลไทม์ ----------
const listeners = new Set();
const sim = {
  seated: true, posture: 'upright', sitStart: Date.now() - 32 * MIN, standSince: 0,
  badStart: 0, lastPoint: 0, battery: 78.4, livePoints: [], alarms: null, acked: new Set(),
};
const sharedKey = 'hc_demo_shared';
function shared() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(sharedKey)) }; } catch { return { ...DEFAULTS }; }
}
const r = rng(Date.now() & 0xffff);

function fsrFor(p) {
  const n = () => (r() - 0.5) * 0.06;
  const c = (x) => Math.max(0, Math.min(1, x + n()));
  // fsr1 หน้าซ้าย, fsr2 หน้าขวา, fsr3 หลังซ้าย, fsr4 หลังขวา, fsr5 พนักล่าง, fsr6 พนักบน
  const base = {
    empty: [0, 0, 0, 0, 0, 0], unknown: [0.4, 0.4, 0.5, 0.5, 0.3, 0.2],
    upright: [0.42, 0.44, 0.62, 0.6, 0.45, 0.35], lean_forward: [0.7, 0.68, 0.35, 0.34, 0.02, 0.0],
    lean_back: [0.25, 0.26, 0.72, 0.7, 0.62, 0.02], lean_left: [0.62, 0.2, 0.78, 0.25, 0.3, 0.2],
    lean_right: [0.2, 0.6, 0.26, 0.76, 0.3, 0.2], perch: [0.78, 0.76, 0.12, 0.1, 0.0, 0.0],
  }[p];
  return base.map((v) => (p === 'empty' ? 0 : Math.round(c(v) * 100)));  // 0–100 % เหมือนเฟิร์มแวร์
}

function snapshot() {
  const s = shared();
  const now = Date.now();
  const sitMin = sim.seated ? Math.floor((now - sim.sitStart) / MIN) : 0;
  const bad = sim.seated && !['upright', 'empty', 'unknown'].includes(sim.posture);
  const badSec = bad && sim.badStart ? Math.floor((now - sim.badStart) / 1000) : 0;
  let alert = 'none';
  if (sim.seated && sitMin >= s.sit_limit_min) alert = 'sit_too_long';
  else if (badSec >= s.bad_posture_alert_sec) alert = 'bad_posture';
  const f = fsrFor(sim.seated ? sim.posture : 'empty');
  const deg = { lean_back: 21, lean_forward: 3, perch: 4 }[sim.posture] ?? 8;
  return {
    posture: sim.seated ? sim.posture : 'empty', occupied: sim.seated, bad_posture: bad, bad_posture_sec: badSec,
    sit_minutes: sitMin, alert, fsr1: f[0], fsr2: f[1], fsr3: f[2], fsr4: f[3], fsr5: f[4], fsr6: f[5],
    backrest_deg: Math.round((deg + (r() - 0.5) * 2) * 10) / 10,
    confidence: sim.seated ? Math.round((0.82 + r() * 0.16) * 1000) / 1000 : 0,
    anomaly: Math.round(r() * 0.12 * 1000) / 1000,
    battery_v: Math.round((3.3 + (sim.battery / 100) * 0.9) * 100) / 100, battery_pct: Math.round(sim.battery),
  };
}

function setPosture(p) {
  if (p === sim.posture) return;
  sim.posture = p;
  sim.badStart = ['upright', 'empty', 'unknown'].includes(p) ? 0 : Date.now();
  sim.livePoints.push({ ts: Date.now(), v: sim.seated ? p : 'empty' });
  sim.lastPoint = Date.now();
}

function tick() {
  const now = Date.now();
  if (sim.seated && r() < 1 / 9) {
    const s = shared();
    // ถ้าปิดเสียงเตือนไว้ คนก็มักไม่แก้ท่า (ให้เห็นผลของการตั้งค่า)
    setPosture(pick(r, weightsFor(sim.posture === 'upright' ? 0.9 : s.muted ? 0.4 : 1.4)));
  }
  if (now - sim.lastPoint >= MIN) { sim.livePoints.push({ ts: now, v: sim.seated ? sim.posture : 'empty' }); sim.lastPoint = now; }
  sim.battery = Math.max(5, sim.battery - 0.0004);
  const snap = snapshot();
  checkLiveAlarm(snap);
  for (const fn of listeners) fn(snap, now);
}
let timer = null;
function ensureTimer() { if (!timer) timer = setInterval(tick, 1000); }

// ---------- alarm จำลอง ----------
function buildAlarms() {
  const list = [];
  const today = startOfDay().getTime();
  for (let i = 14; i >= 1; i--) {
    const ds = today - i * 86400000;
    for (const s of toSessions(toSegments(genDay(ds, ds + 86400000), ds + 86400000))) {
      if (s.minutes >= 45) {
        const t = s.start + 45 * MIN;
        list.push({ id: `a-${t}`, type: 'Sit too long', severity: 'WARNING', createdTime: t, clearTs: s.end, endTs: s.end,
          ackTs: i > 1 ? s.end + 5 * MIN : 0, cleared: true, acknowledged: i > 1, details: { sit_minutes: Math.round(s.minutes) } });
      }
    }
  }
  const lb = today - 9 * 86400000 + 15 * 60 * MIN;
  list.push({ id: `a-${lb}`, type: 'Low battery', severity: 'MAJOR', createdTime: lb, clearTs: lb + 3 * 60 * MIN, endTs: lb + 3 * 60 * MIN,
    ackTs: lb + 20 * MIN, cleared: true, acknowledged: true, details: { battery_pct: 14 } });
  return list;
}
function checkLiveAlarm(snap) {
  if (!sim.alarms) return;
  const active = sim.alarms.find((a) => a.type === 'Sit too long' && !a.cleared);
  if (snap.alert === 'sit_too_long' && !active) {
    sim.alarms.push({ id: `a-${Date.now()}`, type: 'Sit too long', severity: 'WARNING', createdTime: Date.now(), cleared: false,
      acknowledged: false, ackTs: 0, details: { sit_minutes: snap.sit_minutes } });
  } else if (active && snap.alert !== 'sit_too_long') {
    active.cleared = true; active.clearTs = Date.now();
  }
}

const wait = (ms = 250) => new Promise((res) => setTimeout(res, ms));

export const demo = {
  mode: 'demo',
  async login() { await wait(500); localStorage.setItem('hc_demo', '1'); ensureTimer(); return { ...USER }; },
  async restore() { if (localStorage.getItem('hc_demo') !== '1') return null; ensureTimer(); return { ...USER }; },
  async logout() { localStorage.removeItem('hc_demo'); },
  async resetPassword() { await wait(600); },
  async updateProfile(user, patch) { await wait(); Object.assign(USER, patch, { name: `${patch.firstName ?? USER.firstName} ${patch.lastName ?? USER.lastName}`.trim() }); return { ...USER }; },
  async listDevices() { return [{ ...DEVICE, active: true }]; },
  async getDevice() { return { ...DEVICE }; },
  async getLatest() { const values = snapshot(); const ts = {}; for (const k in values) ts[k] = Date.now(); return { values, ts }; },
  async getAttributes() {
    return {
      shared: shared(),
      client: { firmware: '1.4.0', model: 'edge_impulse', mpu_ok: true, rssi: -58 },
      server: { active: true, lastActivityTime: Date.now() },
    };
  },
  async saveShared(id, values) {
    await wait(300);
    localStorage.setItem(sharedKey, JSON.stringify({ ...shared(), ...values }));
  },
  async getPostureSeries(id, startTs, endTs) {
    const out = [];
    const liveFrom = sim.sitStart;
    for (let d = startOfDay(new Date(startTs)).getTime(); d < endTs; d += 86400000) {
      const until = Math.min(d + 86400000, liveFrom);
      if (until > d) out.push(...genDay(d, until));
    }
    // ช่วงที่นั่งอยู่ตอนนี้ (ก่อนเปิดแอป) ให้เป็นท่าตรงสลับเอนไปหน้า
    if (endTs > liveFrom) {
      const appStart = sim.livePoints[0]?.ts ?? Date.now();
      for (let t = liveFrom; t < appStart; t += MIN) out.push({ ts: t, v: (t / MIN) % 7 < 5 ? 'upright' : 'lean_forward' });
      out.push(...sim.livePoints);
    }
    return out.filter((p) => p.ts >= startTs && p.ts <= endTs).sort((a, b) => a.ts - b.ts);
  },
  async getAlarms() { if (!sim.alarms) sim.alarms = buildAlarms(); return [...sim.alarms].sort((a, b) => b.createdTime - a.createdTime); },
  async ackAlarm(alarmId) { const a = sim.alarms?.find((x) => x.id === alarmId); if (a) { a.acknowledged = true; a.ackTs = Date.now(); } },
  subscribe(id, onData) { ensureTimer(); listeners.add(onData); return () => listeners.delete(onData); },

  // ปุ่มพิเศษของเดโม: จำลองลุก/นั่ง
  isSeated: () => sim.seated,
  toggleSeat() {
    const now = Date.now();
    if (sim.seated) { sim.seated = false; sim.standSince = now; sim.livePoints.push({ ts: now, v: 'empty' }); sim.posture = 'empty'; }
    else {
      sim.seated = true;
      if (now - sim.standSince >= MIN) sim.sitStart = now;
      sim.posture = '';
      setPosture('upright');
    }
    sim.lastPoint = now;
    tick();
  },
};
