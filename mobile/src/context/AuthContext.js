import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { setAuthToken, setUnauthorizedHandler } from '../services/api';
import { getItem, setItem } from '../services/storage';

const AuthContext = createContext(null);
const TOKEN_KEY = 'blog.token';

/**
 * Estado global de autenticação (Context API).
 *
 * - `login` troca usuário + senha por um JWT e guarda o token no armazenamento seguro.
 * - Ao abrir o app, o token salvo é validado em GET /me: se venceu ou o usuário
 *   foi excluído, a sessão é descartada.
 * - Qualquer 401 vindo da API (token vencido no meio do uso) encerra a sessão.
 *
 * O papel (professor/aluno) vem do cadastro no servidor — o app nunca o escolhe.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [restoring, setRestoring] = useState(true);

  const logout = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    await setItem(TOKEN_KEY, null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    let active = true;
    (async () => {
      const saved = await getItem(TOKEN_KEY);
      if (!saved) {
        if (active) setRestoring(false);
        return;
      }
      setAuthToken(saved);
      try {
        const me = await api.me();
        if (active) setUser(me);
      } catch (error) {
        // Sem rede, mantemos a pessoa deslogada mas não apagamos o token salvo;
        // com 401 (token vencido) o handler acima já limpou tudo.
        setAuthToken(null);
        if (error.status && error.status !== 0) await setItem(TOKEN_KEY, null);
      } finally {
        if (active) setRestoring(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await api.login(username.trim().toLowerCase(), password);
    setAuthToken(data.token);
    await setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return data.user;
  }, []);

  /** Atualiza o próprio usuário em memória (ex.: professor editou o próprio nome). */
  const refreshUser = useCallback(async () => {
    try {
      setUser(await api.me());
    } catch {
      /* mantém o que tinha */
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      restoring,
      login,
      logout,
      refreshUser,
      isAuthenticated: Boolean(user),
      isTeacher: user?.role === 'professor',
    }),
    [user, restoring, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return context;
}

export default AuthContext;
