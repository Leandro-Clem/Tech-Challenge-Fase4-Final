/* eslint-env jest */
import { render } from '@testing-library/react-native';
import { ConfirmProvider } from '../components/ConfirmDialog';
import AuthContext from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';

export const teacher = { id: 1, name: 'Leandro Clemente', username: 'professor', role: 'professor' };
export const student = { id: 3, name: 'Aluno Demonstração', username: 'aluno', role: 'aluno' };

/** Objeto `navigation` falso para renderizar telas fora de um navegador. */
export function makeNavigation() {
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    canGoBack: jest.fn(() => true),
  };
}

/**
 * Renderiza com os mesmos provedores do App (tema, confirmação, autenticação),
 * mas com o usuário logado definido pelo teste.
 */
export async function renderWithProviders(ui, { user = null, auth = {} } = {}) {
  const authValue = {
    user,
    restoring: false,
    login: jest.fn(),
    logout: jest.fn(),
    refreshUser: jest.fn(),
    isAuthenticated: Boolean(user),
    isTeacher: user?.role === 'professor',
    ...auth,
  };

  const result = await render(
    <ThemeProvider initialMode="light">
      <AuthContext.Provider value={authValue}>
        <ConfirmProvider>{ui}</ConfirmProvider>
      </AuthContext.Provider>
    </ThemeProvider>,
  );
  return { ...result, authValue };
}
