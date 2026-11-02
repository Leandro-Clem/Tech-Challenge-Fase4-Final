import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import api from '../../services/api';
import { makeNavigation, renderWithProviders, student, teacher } from '../../test/utils';
import AdminPostsScreen from '../AdminPostsScreen';
import HomeScreen from '../HomeScreen';
import PostDetailScreen from '../PostDetailScreen';

jest.mock('../../services/api', () => {
  const mock = {
    listPosts: jest.fn(),
    searchPosts: jest.fn(),
    getPost: jest.fn(),
    deletePost: jest.fn(),
    listComments: jest.fn(),
    createComment: jest.fn(),
    deleteComment: jest.fn(),
  };
  return { __esModule: true, default: mock, api: mock };
});

const posts = [
  {
    id: 1,
    title: 'Fotossíntese em 5 minutos',
    content: 'A fotossíntese é o processo em que as plantas transformam luz em energia.',
    author: 'Leandro Clemente',
    authorId: 1,
    createdAt: '2026-11-02T12:00:00.000Z',
  },
  {
    id: 2,
    title: 'Frações sem medo',
    content: 'Uma fração representa partes de um inteiro.',
    author: 'Marina Duarte',
    authorId: 2,
    createdAt: '2026-11-01T12:00:00.000Z',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  api.listComments.mockResolvedValue([]);
});

describe('HomeScreen (lista de posts)', () => {
  test('mostra título, autor e descrição de cada post', async () => {
    api.listPosts.mockResolvedValue(posts);
    await renderWithProviders(<HomeScreen navigation={makeNavigation()} />);

    expect(await screen.findByText('Fotossíntese em 5 minutos')).toBeOnTheScreen();
    expect(screen.getByText('Frações sem medo')).toBeOnTheScreen();
    expect(screen.getByText('Marina Duarte')).toBeOnTheScreen();
    expect(screen.getByText('Uma fração representa partes de um inteiro.')).toBeOnTheScreen();
    expect(screen.getByText('2 publicações no ar')).toBeOnTheScreen();
  });

  test('busca por palavra-chave na API depois de uma pausa na digitação', async () => {
    jest.useFakeTimers();
    try {
      api.listPosts.mockResolvedValue(posts);
      api.searchPosts.mockResolvedValue([posts[1]]);
      await renderWithProviders(<HomeScreen navigation={makeNavigation()} />);
      await screen.findByText('Fotossíntese em 5 minutos');

      await fireEvent.changeText(screen.getByTestId('search-input'), 'fra');
      expect(api.searchPosts).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(450);
      });

      await waitFor(() => expect(api.searchPosts).toHaveBeenCalledWith('fra', expect.anything()));
      expect(await screen.findByText('1 publicação encontrada para “fra”')).toBeOnTheScreen();
      expect(screen.queryByText('Fotossíntese em 5 minutos')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  test('buscar não mostra erro falso quando a requisição anterior é cancelada (Android)', async () => {
    jest.useFakeTimers();
    try {
      // Imita o fetch do Android: ao cancelar, rejeita como falha de rede.
      const androidLike = (value) => (_term, signal) =>
        new Promise((resolve, reject) => {
          const sig = typeof _term === 'object' ? _term : signal;
          const timer = setTimeout(() => resolve(value), 50);
          sig?.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('Não foi possível falar com o servidor.'));
          });
        });
      api.listPosts.mockImplementation(androidLike(posts));
      api.searchPosts.mockImplementation(androidLike([posts[1]]));

      await renderWithProviders(<HomeScreen navigation={makeNavigation()} />);
      await act(async () => {
        jest.advanceTimersByTime(60);
      });
      await screen.findByText('Fotossíntese em 5 minutos');

      await fireEvent.changeText(screen.getByTestId('search-input'), 'fra');
      await act(async () => {
        jest.advanceTimersByTime(450);
      });
      await act(async () => {
        jest.advanceTimersByTime(60);
      });

      expect(await screen.findByText('1 publicação encontrada para “fra”')).toBeOnTheScreen();
      expect(screen.queryByText('Não foi possível falar com o servidor.')).toBeNull();
      // e a busca vai à API uma única vez
      expect(api.searchPosts).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  test('tocar num post abre a leitura', async () => {
    api.listPosts.mockResolvedValue(posts);
    const navigation = makeNavigation();
    await renderWithProviders(<HomeScreen navigation={navigation} />);

    await fireEvent.press(await screen.findByText('Frações sem medo'));
    expect(navigation.navigate).toHaveBeenCalledWith('PostDetail', { id: 2, title: 'Frações sem medo' });
  });

  test('o botão Escrever só aparece para professor', async () => {
    api.listPosts.mockResolvedValue(posts);
    const first = await renderWithProviders(<HomeScreen navigation={makeNavigation()} />, { user: student });
    await screen.findByText('Frações sem medo');
    expect(screen.queryByTestId('fab-new-post')).toBeNull();
    await first.unmount();

    await renderWithProviders(<HomeScreen navigation={makeNavigation()} />, { user: teacher });
    await screen.findByText('Frações sem medo');
    expect(screen.getByTestId('fab-new-post')).toBeOnTheScreen();
  });

  test('mostra o erro de conexão com opção de tentar de novo', async () => {
    api.listPosts.mockRejectedValueOnce(new Error('Não foi possível falar com o servidor.')).mockResolvedValue(posts);
    await renderWithProviders(<HomeScreen navigation={makeNavigation()} />);

    expect(await screen.findByText('Não foi possível falar com o servidor.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Tentar de novo'));
    expect(await screen.findByText('Frações sem medo')).toBeOnTheScreen();
  });
});

describe('PostDetailScreen (leitura)', () => {
  test('mostra o conteúdo completo e, para o autor, Editar e Excluir', async () => {
    api.getPost.mockResolvedValue(posts[0]);
    const navigation = makeNavigation();
    await renderWithProviders(<PostDetailScreen route={{ params: { id: 1 } }} navigation={navigation} />, {
      user: teacher,
    });

    expect(await screen.findByText(posts[0].content)).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Editar'));
    expect(navigation.navigate).toHaveBeenCalledWith('PostForm', { id: 1 });
  });

  test('aluno lê mas não vê os botões de edição', async () => {
    api.getPost.mockResolvedValue(posts[0]);
    await renderWithProviders(<PostDetailScreen route={{ params: { id: 1 } }} navigation={makeNavigation()} />, {
      user: student,
    });

    await screen.findByText(posts[0].content);
    expect(screen.queryByText('Editar')).toBeNull();
    expect(screen.queryByText('Excluir')).toBeNull();
    expect(screen.getByText('Enviar comentário')).toBeOnTheScreen();
  });

  test('visitante é convidado a entrar para comentar', async () => {
    api.getPost.mockResolvedValue(posts[0]);
    const navigation = makeNavigation();
    await renderWithProviders(<PostDetailScreen route={{ params: { id: 1 } }} navigation={navigation} />);

    await fireEvent.press(await screen.findByText('Entrar para comentar'));
    expect(navigation.navigate).toHaveBeenCalledWith('Login');
  });

  test('aluno comenta', async () => {
    api.getPost.mockResolvedValue(posts[0]);
    api.createComment.mockResolvedValue({
      id: 50,
      content: 'Muito bom!',
      author: student.name,
      role: 'aluno',
      userId: student.id,
      createdAt: '2026-11-02T13:00:00.000Z',
    });
    await renderWithProviders(<PostDetailScreen route={{ params: { id: 1 } }} navigation={makeNavigation()} />, {
      user: student,
    });

    await fireEvent.changeText(await screen.findByLabelText(`Comentar como ${student.name}`), 'Muito bom!');
    await fireEvent.press(screen.getByText('Enviar comentário'));

    expect(await screen.findByText('Comentário publicado.')).toBeOnTheScreen();
    expect(api.createComment).toHaveBeenCalledWith(1, 'Muito bom!');
    expect(screen.getByText('Muito bom!')).toBeOnTheScreen();
  });

  test('404 mostra mensagem amigável', async () => {
    api.getPost.mockRejectedValue(Object.assign(new Error('Post não encontrado'), { status: 404 }));
    await renderWithProviders(<PostDetailScreen route={{ params: { id: 99 } }} navigation={makeNavigation()} />);
    expect(await screen.findByText('Publicação não encontrada')).toBeOnTheScreen();
  });
});

describe('AdminPostsScreen (administração de posts)', () => {
  test('lista todas as publicações com Editar e Excluir; as de outro professor ficam bloqueadas', async () => {
    api.listPosts.mockResolvedValue(posts);
    await renderWithProviders(<AdminPostsScreen navigation={makeNavigation()} />, { user: teacher });

    await screen.findByText('Fotossíntese em 5 minutos');
    // filtro "Minhas" por padrão
    expect(screen.queryByText('Frações sem medo')).toBeNull();

    await fireEvent.press(screen.getByText('Todas'));
    expect(screen.getByText('Frações sem medo')).toBeOnTheScreen();
    expect(screen.getByLabelText('Editar Fotossíntese em 5 minutos')).toBeEnabled();
    expect(screen.getByLabelText('Editar Frações sem medo')).toBeDisabled();
    expect(screen.getByLabelText('Excluir Frações sem medo')).toBeDisabled();
    expect(screen.getByText('Publicação de outro professor')).toBeOnTheScreen();
  });

  test('exclui após confirmar', async () => {
    api.listPosts.mockResolvedValue(posts);
    api.deletePost.mockResolvedValue({});
    await renderWithProviders(<AdminPostsScreen navigation={makeNavigation()} />, { user: teacher });

    await fireEvent.press(await screen.findByLabelText('Excluir Fotossíntese em 5 minutos'));
    await fireEvent.press(screen.getByTestId('confirm-dialog-ok'));

    await waitFor(() => expect(api.deletePost).toHaveBeenCalledWith(1));
    expect(await screen.findByText('"Fotossíntese em 5 minutos" foi excluída.')).toBeOnTheScreen();
  });

  test('Editar leva ao formulário', async () => {
    api.listPosts.mockResolvedValue(posts);
    const navigation = makeNavigation();
    await renderWithProviders(<AdminPostsScreen navigation={navigation} />, { user: teacher });

    await fireEvent.press(await screen.findByLabelText('Editar Fotossíntese em 5 minutos'));
    expect(navigation.navigate).toHaveBeenCalledWith('PostForm', { id: 1 });
  });
});
