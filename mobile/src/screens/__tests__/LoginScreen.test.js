import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { makeNavigation, renderWithProviders } from '../../test/utils';
import LoginScreen from '../LoginScreen';

describe('LoginScreen', () => {
  test('pede usuário e SENHA — não existe mais seletor de perfil', async () => {
    await renderWithProviders(<LoginScreen navigation={makeNavigation()} />);

    expect(screen.getByLabelText('Usuário')).toBeOnTheScreen();
    expect(screen.getByLabelText('Senha')).toBeOnTheScreen();
    expect(screen.queryByText(/Entrar como/)).toBeNull();
    expect(screen.queryByText('Estudante')).toBeNull();
  });

  test('valida os campos antes de chamar a API', async () => {
    const { authValue } = await renderWithProviders(<LoginScreen navigation={makeNavigation()} />);

    await fireEvent.press(screen.getByTestId('login-submit'));

    expect(screen.getByText('Informe seu usuário.')).toBeOnTheScreen();
    expect(screen.getByText('Informe sua senha.')).toBeOnTheScreen();
    expect(authValue.login).not.toHaveBeenCalled();
  });

  test('entra e fecha a tela de login', async () => {
    const navigation = makeNavigation();
    const login = jest.fn().mockResolvedValue({ role: 'professor' });
    await renderWithProviders(<LoginScreen navigation={navigation} />, { auth: { login } });

    await fireEvent.changeText(screen.getByLabelText('Usuário'), 'professor');
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'professor123');
    await fireEvent.press(screen.getByTestId('login-submit'));

    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    expect(login).toHaveBeenCalledWith('professor', 'professor123');
  });

  test('mostra o erro de credenciais vindo da API', async () => {
    const login = jest.fn().mockRejectedValue(new Error('Usuário ou senha incorretos.'));
    const navigation = makeNavigation();
    await renderWithProviders(<LoginScreen navigation={navigation} />, { auth: { login } });

    await fireEvent.changeText(screen.getByLabelText('Usuário'), 'professor');
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'errada');
    await fireEvent.press(screen.getByTestId('login-submit'));

    expect(await screen.findByText('Usuário ou senha incorretos.')).toBeOnTheScreen();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  test('a senha começa oculta e pode ser revelada', async () => {
    await renderWithProviders(<LoginScreen navigation={makeNavigation()} />);
    const password = screen.getByLabelText('Senha');
    expect(password.props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByText('Mostrar senha'));
    expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(false);
  });
});
