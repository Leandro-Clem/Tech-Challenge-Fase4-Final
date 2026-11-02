import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { useConfirm } from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import { Avatar, Button, Empty, Notice, SkeletonList, TextField } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useStyles, useTheme } from '../context/ThemeContext';
import useDebouncedValue from '../hooks/useDebouncedValue';
import { usersApi } from '../services/api';
import { roleLabels } from './roles';

const PAGE_SIZE = 8;

/**
 * Requisitos 7 e 8 — Listagem PAGINADA de professores ou alunos
 * (a mesma tela, parametrizada por `route.params.role`).
 * Cada item tem Editar (abre o formulário) e Excluir (remove do sistema).
 */
export default function UsersListScreen({ route, navigation }) {
  const { role } = route.params;
  const labels = roleLabels(role);
  const resource = usersApi(role);

  const s = useStyles(styles);
  const { theme } = useTheme();
  const confirm = useConfirm();
  const { user: me } = useAuth();

  const [result, setResult] = useState({ data: [], page: 1, totalPages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [removing, setRemoving] = useState(null);

  const q = useDebouncedValue(term.trim(), 400);

  useEffect(() => {
    navigation.setOptions({ title: labels.plural });
  }, [navigation, labels.plural]);

  // Nova busca sempre volta para a página 1.
  useEffect(() => setPage(1), [q]);

  const controllerRef = useRef(null);
  const load = useCallback(
    async ({ silent = false } = {}) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const data = await resource.list({ page, limit: PAGE_SIZE, q }, controller.signal);
        // Se a última página ficou vazia (após excluir), volta uma.
        if (data.data.length === 0 && page > 1) {
          setPage(page - 1);
          return;
        }
        setResult(data);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [resource, page, q],
  );

  useFocusEffect(
    useCallback(() => {
      load();
      return () => controllerRef.current?.abort();
    }, [load]),
  );

  async function handleDelete(person) {
    const ok = await confirm({
      title: `Excluir ${labels.singular.toLowerCase()}?`,
      message:
        role === 'professor'
          ? `${person.name} perderá o acesso. As publicações dele continuam no ar.`
          : `${person.name} perderá o acesso ao aplicativo.`,
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!ok) return;

    setRemoving(person.id);
    setFeedback(null);
    setError(null);
    try {
      await resource.remove(person.id);
      setFeedback(`${person.name} foi excluído.`);
      await load({ silent: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setRemoving(null);
    }
  }

  const header = (
    <View style={{ gap: 14, marginBottom: 8 }}>
      <Button
        title={`Cadastrar ${labels.singular.toLowerCase()}`}
        icon="user-plus"
        onPress={() => navigation.navigate('UserForm', { role })}
        testID="users-new"
      />
      <TextField
        value={term}
        onChangeText={setTerm}
        placeholder={`Buscar ${labels.plural.toLowerCase()} por nome, usuário ou e-mail`}
        icon="search"
        accessibilityLabel={`Buscar ${labels.plural.toLowerCase()}`}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {feedback ? <Notice tone="success">{feedback}</Notice> : null}
      {error ? <Notice>{error}</Notice> : null}
      {loading ? <SkeletonList rows={3} /> : null}
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.paper }}
      contentContainerStyle={s.list}
      data={loading ? [] : result.data}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={header}
      ItemSeparatorComponent={() => <View style={s.separator} />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load({ silent: true });
          }}
          tintColor={theme.colors.accent}
        />
      }
      ListEmptyComponent={
        !loading && !error ? (
          <Empty icon="users" title={q ? 'Ninguém encontrado' : `Nenhum ${labels.singular.toLowerCase()} cadastrado`}>
            {q ? 'Tente outro nome.' : `Toque em "Cadastrar ${labels.singular.toLowerCase()}" para começar.`}
          </Empty>
        ) : null
      }
      ListFooterComponent={
        !loading ? (
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            onChange={setPage}
            disabled={loading}
          />
        ) : null
      }
      renderItem={({ item }) => {
        const isMe = item.id === me?.id;
        return (
          <View style={s.row} testID={`user-${item.id}`}>
            <Avatar name={item.name} />
            <View style={s.info}>
              <Text style={s.name}>
                {item.name}
                {isMe ? <Text style={s.me}> (você)</Text> : null}
              </Text>
              <Text style={s.sub}>
                @{item.username}
                {item.email ? ` · ${item.email}` : ''}
              </Text>
              <View style={s.actions}>
                <Button
                  title="Editar"
                  icon="edit-2"
                  variant="secondary"
                  compact
                  onPress={() => navigation.navigate('UserForm', { role, id: item.id })}
                  accessibilityLabel={`Editar ${item.name}`}
                />
                <Button
                  title="Excluir"
                  icon="trash-2"
                  variant="danger"
                  compact
                  disabled={isMe}
                  loading={removing === item.id}
                  onPress={() => {
                    handleDelete(item);
                  }}
                  accessibilityLabel={`Excluir ${item.name}`}
                />
              </View>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = (t) => ({
  list: { padding: t.space.lg, paddingBottom: t.space.xxl * 2, width: '100%', maxWidth: 720, alignSelf: 'center' },
  row: { flexDirection: 'row', gap: t.space.md, paddingVertical: t.space.lg },
  info: { flex: 1, gap: 3 },
  name: { fontFamily: t.fonts.uiBold, fontSize: t.type.body, color: t.colors.ink },
  me: { fontFamily: t.fonts.ui, color: t.colors.inkSoft },
  sub: { fontFamily: t.fonts.ui, fontSize: t.type.small - 1, color: t.colors.inkSoft },
  actions: { flexDirection: 'row', gap: t.space.sm, marginTop: t.space.sm },
  separator: { height: 1, backgroundColor: t.colors.rule },
});
