import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { usersApi } from '../../services/api';
import { makeNavigation, renderWithProviders, teacher } from '../../test/utils';
import UserFormScreen, { validateUser } from '../UserFormScreen';
import UsersListScreen from '../UsersListScreen';

jest.mock('../../services/api', () => {
  const make = () => ({
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  });
  const teachers = make();
  const students = make();
  return {
    __esModule: true,
    usersApi: (role) => (role === 'professor' ? teachers : students),
    default: { teachers, students },
  };
});

const page = (data, pageNumber = 1, totalPages = 2) => ({
  data,
  page: pageNumber,
  limit: 8,
  total: data.length + (totalPages - 1) * 8,
  totalPages,
});

const people = [
  { id: 1, name: 'Leandro Clemente', username: 'professor', email: 'professor@escola.edu.br', role: 'professor' },
  { id: 2, name: 'Marina Duarte', username: 'marina', email: null, role: 'professor' },
];

beforeEach(() => jest.clearAllMocks());

// Os testes rodam para os dois papéis: as telas são as mesmas (requisito 8).
describe.each([
  ['professor', 'Professores', 'Cadastrar professor'],
  ['aluno', 'Alunos', 'Cadastrar aluno'],
])('Listagem de %s', (role, plural, newLabel) => {
  const resource = usersApi(role);

  test('busca a primeira página e mostra cada pessoa com Editar e Excluir', async () => {
    resource.list.mockResolvedValue(page(people));
    const navigation = makeNavigation();
    await renderWithProviders(<UsersListScreen route={{ params: { role } }} navigation={navigation} />, {
      user: teacher,
    });

    expect(await screen.findByText('Marina Duarte')).toBeOnTheScreen();
    expect(resource.list).toHaveBeenCalledWith({ page: 1, limit: 8, q: '' }, expect.anything());
    expect(screen.getByLabelText('Editar Marina Duarte')).toBeOnTheScreen();
    expect(screen.getByLabelText('Excluir Marina Duarte')).toBeOnTheScreen();
    expect(screen.getByText('Página 1 de 2')).toBeOnTheScreen();
    expect(navigation.setOptions).toHaveBeenCalledWith({ title: plural });
    expect(screen.getByText(newLabel)).toBeOnTheScreen();
  });

  test('pagina para a próxima página', async () => {
    resource.list.mockResolvedValueOnce(page(people)).mockResolvedValueOnce(page([people[0]], 2));
    await renderWithProviders(<UsersListScreen route={{ params: { role } }} navigation={makeNavigation()} />, {
      user: teacher,
    });
    await screen.findByText('Página 1 de 2');

    await fireEvent.press(screen.getByLabelText('Próxima página'));

    expect(await screen.findByText('Página 2 de 2')).toBeOnTheScreen();
    expect(resource.list).toHaveBeenLastCalledWith({ page: 2, limit: 8, q: '' }, expect.anything());
    expect(screen.getByLabelText('Próxima página')).toBeDisabled();
  });

  test('Editar abre o formulário com o id', async () => {
    resource.list.mockResolvedValue(page(people));
    const navigation = makeNavigation();
    await renderWithProviders(<UsersListScreen route={{ params: { role } }} navigation={navigation} />, {
      user: teacher,
    });

    await fireEvent.press(await screen.findByLabelText('Editar Marina Duarte'));
    expect(navigation.navigate).toHaveBeenCalledWith('UserForm', { role, id: 2 });
  });

  test('Excluir pede confirmação e remove', async () => {
    resource.list.mockResolvedValue(page(people));
    resource.remove.mockResolvedValue({});
    await renderWithProviders(<UsersListScreen route={{ params: { role } }} navigation={makeNavigation()} />, {
      user: teacher,
    });

    await fireEvent.press(await screen.findByLabelText('Excluir Marina Duarte'));
    expect(screen.getByText(/Excluir (professor|aluno)\?/)).toBeOnTheScreen();
    expect(resource.remove).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('confirm-dialog-ok'));

    await waitFor(() => expect(resource.remove).toHaveBeenCalledWith(2));
    expect(await screen.findByText('Marina Duarte foi excluído.')).toBeOnTheScreen();
  });

  test('cancelar a confirmação não exclui', async () => {
    resource.list.mockResolvedValue(page(people));
    await renderWithProviders(<UsersListScreen route={{ params: { role } }} navigation={makeNavigation()} />, {
      user: teacher,
    });

    await fireEvent.press(await screen.findByLabelText('Excluir Marina Duarte'));
    await fireEvent.press(screen.getByText('Cancelar'));
    expect(resource.remove).not.toHaveBeenCalled();
  });
});

test('o professor não consegue excluir a própria conta pela lista', async () => {
  usersApi('professor').list.mockResolvedValue(page(people, 1, 1));
  await renderWithProviders(
    <UsersListScreen route={{ params: { role: 'professor' } }} navigation={makeNavigation()} />,
    { user: teacher },
  );
  expect(await screen.findByLabelText('Excluir Leandro Clemente')).toBeDisabled();
  expect(screen.getByText('(você)', { exact: false })).toBeOnTheScreen();
});

describe('Formulário de usuário', () => {
  test('cadastro: valida e envia nome, usuário em minúsculas, e-mail e senha', async () => {
    const resource = usersApi('aluno');
    resource.create.mockResolvedValue({ id: 9 });
    const navigation = makeNavigation();
    await renderWithProviders(<UserFormScreen route={{ params: { role: 'aluno' } }} navigation={navigation} />, {
      user: teacher,
    });

    await fireEvent.press(screen.getByTestId('user-submit'));
    expect(screen.getByText('A senha precisa ter pelo menos 6 caracteres.')).toBeOnTheScreen();
    expect(resource.create).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText('Nome completo'), 'Pedro Lima');
    await fireEvent.changeText(screen.getByLabelText('Usuário (para entrar)'), 'Pedro.Lima');
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'segredo1');
    await fireEvent.press(screen.getByTestId('user-submit'));

    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    expect(resource.create).toHaveBeenCalledWith({
      name: 'Pedro Lima',
      username: 'pedro.lima',
      email: null,
      password: 'segredo1',
    });
  });

  test('edição: carrega os dados e não envia senha em branco', async () => {
    const resource = usersApi('professor');
    resource.get.mockResolvedValue(people[1]);
    resource.update.mockResolvedValue({});
    const navigation = makeNavigation();
    await renderWithProviders(
      <UserFormScreen route={{ params: { role: 'professor', id: 2 } }} navigation={navigation} />,
      { user: teacher },
    );

    const name = await screen.findByDisplayValue('Marina Duarte');
    expect(screen.getByDisplayValue('marina')).toBeOnTheScreen();
    expect(screen.getByText('Deixe em branco para manter a senha atual.')).toBeOnTheScreen();

    await fireEvent.changeText(name, 'Marina D. Souza');
    await fireEvent.press(screen.getByText('Salvar alterações'));

    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    expect(resource.update).toHaveBeenCalledWith(2, { name: 'Marina D. Souza', username: 'marina', email: null });
  });

  test('mostra usuário duplicado devolvido pela API no campo certo', async () => {
    const resource = usersApi('professor');
    resource.create.mockRejectedValue(
      Object.assign(new Error('Este usuário já está em uso.'), {
        status: 409,
        fieldErrors: { username: 'Este usuário já está em uso.' },
      }),
    );
    await renderWithProviders(
      <UserFormScreen route={{ params: { role: 'professor' } }} navigation={makeNavigation()} />,
      { user: teacher },
    );

    await fireEvent.changeText(screen.getByLabelText('Nome completo'), 'Marina Duarte');
    await fireEvent.changeText(screen.getByLabelText('Usuário (para entrar)'), 'marina');
    await fireEvent.changeText(screen.getByLabelText('Senha'), 'segredo1');
    await fireEvent.press(screen.getByTestId('user-submit'));

    expect(await screen.findAllByText('Este usuário já está em uso.')).toHaveLength(2);
  });

  test('validateUser', () => {
    const ok = { name: 'Ana Paula', username: 'ana', email: '', password: '123456' };
    expect(validateUser(ok, { editing: false })).toEqual({});
    expect(validateUser({ ...ok, password: '' }, { editing: true })).toEqual({});
    expect(validateUser({ ...ok, password: '' }, { editing: false })).toHaveProperty('password');
    expect(validateUser({ ...ok, email: 'x@' }, { editing: false })).toHaveProperty('email');
    expect(validateUser({ ...ok, username: 'com espaço' }, { editing: false })).toHaveProperty('username');
  });
});
