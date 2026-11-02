import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import PostCard, { PostCardSeparator } from '../components/PostCard';
import { Empty, Lead, Notice, Ruled, SkeletonList, TextField, Title, Button } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useStyles, useTheme } from '../context/ThemeContext';
import useDebouncedValue from '../hooks/useDebouncedValue';
import api from '../services/api';
import { plural } from '../utils/format';

/**
 * Requisito 1 — Página principal: lista de posts com título, autor e descrição,
 * e campo de busca por palavra-chave (consulta a API com debounce de 400 ms).
 */
export default function HomeScreen({ navigation }) {
  const s = useStyles(styles);
  const { theme } = useTheme();
  const { isTeacher } = useAuth();

  const [posts, setPosts] = useState([]);
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const search = useDebouncedValue(term.trim(), 400);
  const controllerRef = useRef(null);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      if (!silent) setLoading(true);
      setError(null);
      try {
        const data = search
          ? await api.searchPosts(search, controller.signal)
          : await api.listPosts(controller.signal);
        setPosts(Array.isArray(data) ? data : []);
      } catch (err) {
        // Uma requisição substituída por outra mais nova não é erro.
        if (controller.signal.aborted || err.name === 'AbortError') return;
        setError(err.message);
        setPosts([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [search],
  );

  // Recarrega ao mudar a busca…
  useEffect(() => {
    load();
    return () => controllerRef.current?.abort();
  }, [load]);

  // …e, silenciosamente, quando a tela VOLTA a ficar visível
  // (ex.: depois de publicar ou excluir um post em outra tela).
  // O efeito lê a versão atual de `load` por uma ref e só depende do foco:
  // assim, mudar a busca não dispara uma segunda carga em paralelo.
  const loadRef = useRef(load);
  loadRef.current = load;
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      loadRef.current({ silent: true });
    }, []),
  );

  const header = (
    <View style={s.header}>
      <Ruled>
        <Title>O que está sendo ensinado hoje</Title>
        <Lead>Aulas, resumos e materiais publicados por professores da rede pública.</Lead>
      </Ruled>

      <TextField
        value={term}
        onChangeText={setTerm}
        placeholder="Buscar por assunto, palavra ou professor"
        icon="search"
        accessibilityLabel="Buscar publicações"
        returnKeyType="search"
        autoCorrect={false}
        style={s.search}
        testID="search-input"
      />

      <Text style={s.status} accessibilityLiveRegion="polite">
        {loading
          ? 'Carregando publicações…'
          : search
            ? `${plural(posts.length, 'publicação encontrada', 'publicações encontradas')} para “${search}”`
            : `${plural(posts.length, 'publicação', 'publicações')} no ar`}
      </Text>

      {error ? (
        <View style={{ gap: 10 }}>
          <Notice>{error}</Notice>
          <Button title="Tentar de novo" icon="refresh-cw" variant="secondary" onPress={() => load()} />
        </View>
      ) : null}
      {loading ? <SkeletonList rows={3} /> : null}
    </View>
  );

  return (
    <View style={s.root}>
      <FlatList
        data={loading || error ? [] : posts}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => (
          <PostCard
            post={item}
            featured={!search && index === 0}
            onPress={() => navigation.navigate('PostDetail', { id: item.id, title: item.title })}
          />
        )}
        ItemSeparatorComponent={PostCardSeparator}
        ListHeaderComponent={header}
        ListEmptyComponent={
          !loading && !error ? (
            <Empty icon={search ? 'search' : 'book-open'} title={search ? 'Nada encontrado' : 'Ainda não há publicações'}>
              {search
                ? 'Tente outra palavra ou limpe a busca para ver tudo.'
                : 'Assim que um professor publicar a primeira aula, ela aparece aqui.'}
            </Empty>
          ) : null
        }
        contentContainerStyle={s.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load({ silent: true });
            }}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
      />

      {isTeacher ? (
        <Pressable
          style={({ pressed }) => [s.fab, pressed && { opacity: 0.85 }]}
          onPress={() => navigation.navigate('PostForm')}
          accessibilityRole="button"
          accessibilityLabel="Nova publicação"
          testID="fab-new-post"
        >
          <Feather name="edit-3" size={20} color={theme.colors.onAccent} />
          <Text style={s.fabText}>Escrever</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = (t) => ({
  root: { flex: 1, backgroundColor: t.colors.paper },
  list: { padding: t.space.lg, paddingBottom: 110, width: '100%', maxWidth: 720, alignSelf: 'center' },
  header: { gap: t.space.lg, marginBottom: t.space.sm },
  search: { marginTop: t.space.sm },
  status: { fontFamily: t.fonts.ui, fontSize: t.type.small - 1, color: t.colors.inkSoft },
  fab: {
    position: 'absolute',
    right: t.space.lg,
    bottom: t.space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    backgroundColor: t.colors.accent,
    paddingHorizontal: t.space.xl,
    height: 52,
    borderRadius: t.radius.pill,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  fabText: { fontFamily: t.fonts.uiBold, fontSize: t.type.body, color: t.colors.onAccent },
});
