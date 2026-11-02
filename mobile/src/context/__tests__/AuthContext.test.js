import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import api from '../../services/api';
import { AuthProvider, useAuth } from '../AuthContext';

jest.mock('../../services/api', () => {
  const actual = jest.requireActual('../../services/api');
  const mock = { login: jest.fn(), me: jest.fn() };
  return {
    __esModule: true,
    default: mock,
    api: mock,
    setAuthToken: jest.fn(),
    setUnauthorizedHandler: jest.fn(),
    ApiError: actual.ApiError,
  };
});

const services = jest.requireMock('../../services/api');
const professor = { id: 1, name: 'Leandro Clemente', username: 'professor', role: 'professor' };

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

beforeEach(async () => {
  jest.clearAllMocks();
  await SecureStore.deleteItemAsync('blog.token');
});

describe('AuthContext', () => {
  test('sem token salvo começa deslogado', async () => {
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.restoring).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(api.me).not.toHaveBeenCalled();
  });

  test('login guarda o token no armazenamento seguro e expõe o papel', async () => {
    api.login.mockResolvedValue({ token: 'jwt-123', user: professor });
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.restoring).toBe(false));

    await act(async () => {
      await result.current.login('  Professor ', 'professor123');
    });

    expect(api.login).toHaveBeenCalledWith('professor', 'professor123');
    expect(services.setAuthToken).toHaveBeenCalledWith('jwt-123');
    expect(await SecureStore.getItemAsync('blog.token')).toBe('jwt-123');
    expect(result.current.isTeacher).toBe(true);
    expect(result.current.user.name).toBe('Leandro Clemente');
  });

  test('ao reabrir o app, valida o token salvo em /me', async () => {
    await SecureStore.setItemAsync('blog.token', 'salvo');
    api.me.mockResolvedValue(professor);

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(services.setAuthToken).toHaveBeenCalledWith('salvo');
  });

  test('token salvo inválido é descartado', async () => {
    await SecureStore.setItemAsync('blog.token', 'vencido');
    api.me.mockRejectedValue(Object.assign(new Error('expirado'), { status: 401 }));

    const { result } = await renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.restoring).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(await SecureStore.getItemAsync('blog.token')).toBeNull();
  });

  test('logout limpa usuário e token', async () => {
    api.login.mockResolvedValue({ token: 'jwt-123', user: professor });
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.restoring).toBe(false));
    await act(async () => {
      await result.current.login('professor', 'professor123');
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(await SecureStore.getItemAsync('blog.token')).toBeNull();
  });

  test('registra o handler que encerra a sessão quando a API responde 401', async () => {
    api.login.mockResolvedValue({ token: 'jwt-123', user: professor });
    const { result } = await renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.restoring).toBe(false));
    await act(async () => {
      await result.current.login('professor', 'professor123');
    });

    const handler = services.setUnauthorizedHandler.mock.calls.find(([fn]) => typeof fn === 'function')[0];
    await act(async () => {
      handler();
    });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(false));
  });
});
