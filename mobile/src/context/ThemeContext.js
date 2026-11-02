import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { getItem, setItem } from '../services/storage';
import { buildTheme } from '../theme/tokens';

const ThemeContext = createContext(null);
const KEY = 'blog.theme';

/**
 * Tema claro/escuro. Começa seguindo o sistema; se a pessoa escolher manualmente
 * na aba Conta, a escolha é salva e passa a valer nas próximas aberturas.
 */
export function ThemeProvider({ children, initialMode }) {
  const system = useColorScheme();
  const [preference, setPreference] = useState(initialMode ?? 'system'); // 'system' | 'light' | 'dark'

  useEffect(() => {
    if (initialMode) return;
    getItem(KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') setPreference(saved);
    });
  }, [initialMode]);

  const choose = useCallback((next) => {
    setPreference(next);
    setItem(KEY, next);
  }, []);

  const mode = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo(
    () => ({ theme: buildTheme(mode), mode, preference, setPreference: choose }),
    [mode, preference, choose],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme precisa estar dentro de <ThemeProvider>.');
  return context;
}

/**
 * Cria estilos dependentes do tema, recalculando só quando o tema muda.
 *   const styles = useStyles((t) => ({ box: { backgroundColor: t.colors.sheet } }));
 */
export function useStyles(factory) {
  const { theme } = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
}

export default ThemeContext;
