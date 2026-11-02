import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import api from '../../services/api';
import { makeNavigation, renderWithProviders, teacher } from '../../test/utils';
import PostFormScreen, { validatePost } from '../PostFormScreen';

jest.mock('../../services/api', () => {
  const mock = {
    getPost: jest.fn(),
    createPost: jest.fn(),
    updatePost: jest.fn(),
  };
  return { __esModule: true, default: mock, api: mock };
});

beforeEach(() => jest.clearAllMocks());

// A tela de criação era a lacuna de cobertura apontada na Fase 3.
describe('PostFormScreen — criação (nova publicação)', () => {
  async function renderCreate() {
    const navigation = makeNavigation();
    await renderWithProviders(<PostFormScreen route={{ params: {} }} navigation={navigation} />, {
      user: teacher,
    });
    return navigation;
  }

  test('mostra os campos título, conteúdo e autor, com o autor preenchido e bloqueado', async () => {
    await renderCreate();

    expect(screen.getByLabelText('Título')).toBeOnTheScreen();
    expect(screen.getByLabelText('Conteúdo')).toBeOnTheScreen();

    const author = screen.getByLabelText('Autor');
    expect(author).toHaveDisplayValue('Leandro Clemente');
    expect(author).not.toBeEnabled();
    expect(screen.getByText('Publicar')).toBeOnTheScreen();
  });

  test('não envia e mostra os erros quando os campos estão vazios', async () => {
    await renderCreate();

    await fireEvent.press(screen.getByTestId('post-submit'));

    expect(screen.getByText('O título precisa de pelo menos 3 caracteres.')).toBeOnTheScreen();
    expect(screen.getByText('Escreva um conteúdo com pelo menos 10 caracteres.')).toBeOnTheScreen();
    expect(api.createPost).not.toHaveBeenCalled();
  });

  test('o erro some quando a pessoa corrige o campo', async () => {
    await renderCreate();
    await fireEvent.press(screen.getByTestId('post-submit'));
    expect(screen.getByText('O título precisa de pelo menos 3 caracteres.')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Título'), 'Fotossíntese');

    expect(screen.queryByText('O título precisa de pelo menos 3 caracteres.')).toBeNull();
  });

  test('envia título e conteúdo sem espaços extras e volta para a tela anterior', async () => {
    api.createPost.mockResolvedValue({ id: 10 });
    const navigation = await renderCreate();

    await fireEvent.changeText(screen.getByLabelText('Título'), '  Ciclo da água  ');
    await fireEvent.changeText(screen.getByLabelText('Conteúdo'), '  Evaporação, condensação e precipitação.  ');
    await fireEvent.press(screen.getByTestId('post-submit'));

    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    // O autor não vai no corpo: a API o define pelo token.
    expect(api.createPost).toHaveBeenCalledWith({
      title: 'Ciclo da água',
      content: 'Evaporação, condensação e precipitação.',
    });
  });

  test('mostra a mensagem do servidor quando a criação falha e permanece na tela', async () => {
    api.createPost.mockRejectedValue(
      Object.assign(new Error('Sua sessão expirou. Entre novamente para continuar.'), { status: 401 }),
    );
    const navigation = await renderCreate();

    await fireEvent.changeText(screen.getByLabelText('Título'), 'Ciclo da água');
    await fireEvent.changeText(screen.getByLabelText('Conteúdo'), 'Evaporação, condensação e precipitação.');
    await fireEvent.press(screen.getByTestId('post-submit'));

    expect(await screen.findByText('Sua sessão expirou. Entre novamente para continuar.')).toBeOnTheScreen();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  test('exibe os erros por campo devolvidos pela API', async () => {
    api.createPost.mockRejectedValue(
      Object.assign(new Error('Confira os campos destacados.'), {
        status: 400,
        fieldErrors: { title: 'Título recusado pelo servidor.' },
      }),
    );
    await renderCreate();

    await fireEvent.changeText(screen.getByLabelText('Título'), 'Ciclo da água');
    await fireEvent.changeText(screen.getByLabelText('Conteúdo'), 'Evaporação, condensação e precipitação.');
    await fireEvent.press(screen.getByTestId('post-submit'));

    expect(await screen.findByText('Título recusado pelo servidor.')).toBeOnTheScreen();
  });

  test('define o título do cabeçalho', async () => {
    const navigation = await renderCreate();
    expect(navigation.setOptions).toHaveBeenCalledWith({ title: 'Nova publicação' });
  });
});

describe('PostFormScreen — edição', () => {
  const post = { id: 7, title: 'Frações', content: 'Conteúdo original da aula.', author: 'Marina Duarte' };

  test('carrega os dados atuais do post e salva as alterações', async () => {
    api.getPost.mockResolvedValue(post);
    api.updatePost.mockResolvedValue({ ...post, title: 'Frações sem medo' });
    const navigation = makeNavigation();

    await renderWithProviders(<PostFormScreen route={{ params: { id: 7 } }} navigation={navigation} />, {
      user: teacher,
    });

    const title = await screen.findByDisplayValue('Frações');
    expect(screen.getByDisplayValue('Conteúdo original da aula.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Autor')).toHaveDisplayValue('Marina Duarte');
    expect(api.getPost).toHaveBeenCalledWith(7, expect.anything());

    await fireEvent.changeText(title, 'Frações sem medo');
    await fireEvent.press(screen.getByText('Salvar alterações'));

    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    expect(api.updatePost).toHaveBeenCalledWith(7, {
      title: 'Frações sem medo',
      content: 'Conteúdo original da aula.',
    });
    expect(api.createPost).not.toHaveBeenCalled();
  });

  test('mostra erro se o post não puder ser carregado', async () => {
    api.getPost.mockRejectedValue(new Error('Post não encontrado'));
    await renderWithProviders(<PostFormScreen route={{ params: { id: 99 } }} navigation={makeNavigation()} />, {
      user: teacher,
    });
    expect(await screen.findByText('Post não encontrado')).toBeOnTheScreen();
  });
});

describe('validatePost', () => {
  test('aceita valores válidos', () => {
    expect(validatePost({ title: 'Aula 1', content: 'Conteúdo suficiente' })).toEqual({});
  });
  test('ignora espaços ao medir', () => {
    expect(validatePost({ title: '  a  ', content: '          ' })).toHaveProperty('title');
  });
});
