import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import AuthShell from './AuthShell';

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');

  if (user) return <Navigate to="/" replace />;

  const go = async (mode) => {
    setErr('');
    if (mode === 'live' && (!email || !password)) { setErr('กรุณากรอกอีเมลและรหัสผ่าน'); return; }
    setBusy(mode);
    try { await login(mode, email.trim(), password); nav(loc.state?.from || '/', { replace: true }); }
    catch (e) { setErr(e.message); }
    finally { setBusy(''); }
  };

  return (
    <AuthShell>
      <form className="form-card" onSubmit={(e) => { e.preventDefault(); go('live'); }}>
        <h1>เข้าสู่ระบบ</h1>
        <p className="muted">ใช้บัญชีเดียวกับ ThingsBoard ที่ผูกกับเก้าอี้</p>
        <label className="field">
          <span>อีเมล</span>
          <div className="input-icon"><Icon name="mail" size={18} />
            <input type="email" autoComplete="username" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </label>
        <label className="field">
          <span>รหัสผ่าน</span>
          <div className="input-icon"><Icon name="lock" size={18} />
            <input type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="icon-btn sm" onClick={() => setShow(!show)} aria-label="แสดงรหัสผ่าน"><Icon name="eye" size={18} /></button>
          </div>
        </label>
        <div className="row-between">
          <span />
          <Link to="/forgot" className="link">ลืมรหัสผ่าน?</Link>
        </div>
        {err && <div className="alert tone-bad"><Icon name="alert" size={18} />{err}</div>}
        <button className="btn primary block" disabled={!!busy}>{busy === 'live' ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</button>
        <div className="divider"><span>หรือ</span></div>
        <button type="button" className="btn soft block" disabled={!!busy} onClick={() => go('demo')}>
          <Icon name="play" size={18} />{busy === 'demo' ? 'กำลังเปิด…' : 'ทดลองใช้โหมดเดโม (ไม่ต้องมีเก้าอี้)'}
        </button>
        <p className="fine muted">ยังไม่มีบัญชี? ให้ผู้ดูแลระบบสร้างผู้ใช้ใน ThingsBoard (Customers → Users) แล้วส่งลิงก์เปิดใช้งานทางอีเมล</p>
      </form>
    </AuthShell>
  );
}
