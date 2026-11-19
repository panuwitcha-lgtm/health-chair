import Icon from '../components/Icon';
import PostureFigure from '../components/PostureFigure';

export default function AuthShell({ children }) {
  return (
    <div className="auth">
      <div className="auth-art">
        <div className="brand light">
          <span className="brand-mark"><Icon name="chair" size={22} /></span>
          <div><strong>Health Chair</strong><small>นั่งดี สุขภาพดี</small></div>
        </div>
        <div className="auth-fig"><PostureFigure posture="upright" size={260} /></div>
        <h2>เก้าอี้ที่คอยดูแลท่านั่งของคุณ</h2>
        <p>ตรวจท่านั่งด้วย AI จากเซนเซอร์แรงกด 6 จุด เตือนเมื่อนั่งผิดท่าหรือนั่งนานเกินไป และเก็บสถิติให้ดูย้อนหลัง</p>
      </div>
      <div className="auth-form">{children}</div>
    </div>
  );
}
