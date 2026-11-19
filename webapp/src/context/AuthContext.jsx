import { createContext, useContext, useEffect, useState } from 'react';
import { api, getMode, setMode } from '../api';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setModeState] = useState(getMode());

  useEffect(() => { api().restore().then(setUser).finally(() => setLoading(false)); }, []);

  const login = async (m, email, password) => {
    setMode(m); setModeState(m);
    const u = await api().login(email, password);
    setUser(u);
    return u;
  };
  const logout = async () => { await api().logout(); setUser(null); };
  const updateProfile = async (patch) => { const u = await api().updateProfile(user, patch); setUser(u); return u; };

  return <Ctx.Provider value={{ user, loading, mode, login, logout, updateProfile }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
