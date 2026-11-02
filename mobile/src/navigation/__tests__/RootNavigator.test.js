import { NavigationContainer } from '@react-navigation/native';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ConfirmProvider } from '../../components/ConfirmDialog';
import AuthContext from '../../context/AuthContext';
import { ThemeProvider } from '../../context/ThemeContext';
import { student, teacher } from '../../test/utils';
import RootNavigator from '../RootNavigator';

jest.mock('../../services/api', () => {
  const list = jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, totalPages: 1 });
  const mock = {
    listPosts: jest.fn().mockResolvedValue([]),
    searchPosts: jest.fn().mockResolvedValue([]),
    teachers: { list },
    students: { list },
  };
  return { __esModule: true, default: mock, api: mock };
});

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

function renderApp(user) {
  const auth = {
    user,
    restoring: false,
    isAuthenticated: Boolean(user),
    isTeacher: user?.role === 'professor',
    login: jest.fn(),
    logout: jest.fn(),
    refreshUser: jest.fn(),
  };
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider initialMode="light">
        <AuthContext.Provider value={auth}>
          <NavigationContainer>
            <ConfirmProvider>
              <RootNavigator />
            </ConfirmProvider>
          </NavigationContainer>
        </AuthContext.Provider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

// Autorização na navegação: as rotas administrativas só existem para professores.
describe('RootNavigator', () => {
  test('visitante vê Publicações e Conta, sem Gerenciar', async () => {
    await renderApp(null);
    expect(await screen.findByText('Publicações')).toBeOnTheScreen();
    expect(screen.getByText('Conta')).toBeOnTheScreen();
    expect(screen.queryByText('Gerenciar')).toBeNull();
  });

  test('aluno logado também não vê Gerenciar', async () => {
    await renderApp(student);
    await screen.findByText('Publicações');
    expect(screen.queryByText('Gerenciar')).toBeNull();
  });

  test('professor vê a aba Gerenciar', async () => {
    await renderApp(teacher);
    expect(await screen.findByText('Gerenciar')).toBeOnTheScreen();
  });
});
