import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useConfirm } from '../components/ConfirmDialog';
import { Button, Empty, Notice, SkeletonList } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useStyles, useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { formatDate } from '../utils/format';

/**
 * Requisito 9 — Página administrativa de postagens:
 * todas as publicações, cada uma com Editar e Excluir.
 *
 * A API só deixa o autor alterar o próprio post; nos posts de outros
 * professores os botões aparecem desabilitados, com o motivo explicado.
 */
export default function AdminPostsScreen({ navigation }) {
  const s = useStyles(styles);
  const { theme } = useTheme();
  const confirm = useConfirm();
  const { user } = useAuth();

  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('mine'); // 'mine' | 'all'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [removing, setRemoving] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.listPosts();
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const canManage = useCallback(
    (post) => post.authorId === user?.id || post.authorId === null,
    [user],
  );

  const visible = useMemo(
    () => (filter === 'mine' ? posts.filter(canManage) : posts),
    [posts, filter, canManage],
  );

  async function handleDelete(post) {
    const ok = await confirm({
      title: 'Excluir publicação?',
      message: `"${post.title}" e os comentários dela serão apagados. Não dá para desfazer.`,
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!ok) return;

    setRemoving(post.id);
    setFeedback(null);
    setError(null);
    try {
      await api.deletePost(post.id);
      setPosts((current) => current.filter((p) => p.id !== post.id));
      setFeedback(`"${post.title}" foi excluída.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setRemoving(null);
    }
  }

  const header = (
    <View style={{ gap: 14, marginBottom: 8 }}>
      <View style={s.filter} accessibilityRole="tablist">
        {[
          ['mine', 'Minhas'],
          ['all', 'Todas'],
        ].map(([value, label]) => (
          <Pressable
            key={value}
            onPress={() => setFilter(value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === value }}
            style={[s.filterItem, filter === value && s.filterActive]}
          >
            <Text style={[s.filterText, filter === value && s.filterTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Button title="Nova publicação" icon="plus" onPress={() => navigation.navigate('PostForm')} />
      {feedback ? <Notice tone="success">{feedback}</Notice> : null}
      {error ? <Notice>{error}</Notice> : null}
      {loading ? <SkeletonList rows={3} /> : null}
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: theme.colors.paper }}
      contentContainerStyle={s.list}
      data={loading ? [] : visible}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={header}
      ItemSeparatorComponent={() => <View style={s.separator} />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={theme.colors.accent}
        />
      }
      ListEmptyComponent={
        !loading ? (
          <Empty icon="file-text" title={filter === 'mine' ? 'Você ainda não publicou' : 'Nenhuma publicação'}>
            {filter === 'mine' ? 'Toque em "Nova publicação" para escrever a primeira.' : null}
          </Empty>
        ) : null
      }
      renderItem={({ item }) => {
        const mine = canManage(item);
        return (
          <View style={s.row} testID={`admin-post-${item.id}`}>
            <Pressable onPress={() => navigation.navigate('PostDetail', { id: item.id })}>
              <Text style={s.title}>{item.title}</Text>
              <Text style={s.meta}>
                {item.author} · {formatDate(item.createdAt)}
              </Text>
            </Pressable>
            <View style={s.actions}>
              <Button
                title="Editar"
                icon="edit-2"
                variant="secondary"
                compact
                disabled={!mine}
                onPress={() => navigation.navigate('PostForm', { id: item.id })}
                accessibilityLabel={`Editar ${item.title}`}
              />
              <Button
                title="Excluir"
                icon="trash-2"
                variant="danger"
                compact
                disabled={!mine}
                loading={removing === item.id}
                onPress={() => {
                  handleDelete(item);
                }}
                accessibilityLabel={`Excluir ${item.title}`}
              />
              {!mine ? <Text style={s.lock}>Publicação de outro professor</Text> : null}
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = (t) => ({
  list: { padding: t.space.lg, paddingBottom: t.space.xxl * 2, width: '100%', maxWidth: 720, alignSelf: 'center' },
  filter: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: t.colors.rule,
    borderRadius: t.radius.md,
    overflow: 'hidden',
  },
  filterItem: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: t.colors.sheet },
  filterActive: { backgroundColor: t.colors.accentSoft },
  filterText: { fontFamily: t.fonts.uiMedium, fontSize: t.type.small, color: t.colors.inkSoft },
  filterTextActive: { color: t.colors.accent },
  row: { paddingVertical: t.space.lg, gap: t.space.md },
  title: { fontFamily: t.fonts.textBold, fontSize: t.type.heading, color: t.colors.ink, lineHeight: 24 },
  meta: { fontFamily: t.fonts.ui, fontSize: t.type.small - 1, color: t.colors.inkSoft, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm, flexWrap: 'wrap' },
  lock: { fontFamily: t.fonts.ui, fontSize: t.type.tiny, color: t.colors.inkFaint },
  separator: { height: 1, backgroundColor: t.colors.rule },
});
