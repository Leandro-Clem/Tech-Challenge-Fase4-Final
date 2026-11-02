import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import Comments from '../components/Comments';
import { useConfirm } from '../components/ConfirmDialog';
import Screen from '../components/Screen';
import { Button, Divider, Empty, Notice, Row, SkeletonLine } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useStyles } from '../context/ThemeContext';
import api from '../services/api';
import { formatDate, readingTime } from '../utils/format';

/** Requisito 2 — Leitura do post completo + comentários (opcional). */
export default function PostDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const s = useStyles(styles);
  const confirm = useConfirm();
  const { user, isTeacher } = useAuth();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Recarrega ao voltar da edição, para mostrar o texto atualizado.
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      (async () => {
        setError(null);
        try {
          const data = await api.getPost(id, controller.signal);
          setPost(data);
          navigation.setOptions({ title: data.title });
        } catch (err) {
          if (err.name !== 'AbortError') setError(err);
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      })();
      return () => controller.abort();
    }, [id, navigation]),
  );

  async function handleDelete() {
    const ok = await confirm({
      title: 'Excluir publicação?',
      message: `"${post.title}" e os comentários dela serão apagados. Não dá para desfazer.`,
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await api.deletePost(post.id);
      navigation.goBack();
    } catch (err) {
      setError(err);
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <View style={{ gap: 12 }} accessibilityLabel="Carregando publicação">
          <SkeletonLine width="85%" height={30} />
          <SkeletonLine width="40%" />
          <SkeletonLine />
          <SkeletonLine />
          <SkeletonLine width="65%" />
        </View>
      </Screen>
    );
  }

  if (error && !post) {
    return (
      <Screen>
        <Empty icon="alert-triangle" title={error.status === 404 ? 'Publicação não encontrada' : 'Não deu para abrir'}>
          {error.status === 404
            ? 'Ela pode ter sido excluída pelo professor.'
            : error.message}
        </Empty>
        <Button title="Voltar" icon="arrow-left" variant="secondary" onPress={() => navigation.goBack()} />
      </Screen>
    );
  }

  const isOwner = isTeacher && (post.authorId === user?.id || post.authorId === null);
  const paragraphs = String(post.content).split(/\n{2,}|\r\n{2,}/).filter(Boolean);
  const date = formatDate(post.createdAt);

  return (
    <Screen testID="post-detail">
      <Text style={s.title} accessibilityRole="header">
        {post.title}
      </Text>
      <Text style={s.meta}>
        <Text style={s.author}>{post.author}</Text>
        {date ? ` · ${date}` : ''} · {readingTime(post.content)} min de leitura
      </Text>

      <View style={s.body}>
        {paragraphs.map((paragraph, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <Text key={index} style={s.paragraph}>
            {paragraph}
          </Text>
        ))}
      </View>

      {error ? <Notice style={{ marginTop: 16 }}>{error.message}</Notice> : null}

      {isOwner ? (
        <>
          <Divider />
          <Notice tone="success">
            {post.authorId === null
              ? 'Esta publicação não tem mais autor cadastrado; qualquer professor pode administrá-la.'
              : 'Esta publicação é sua: você pode editá-la ou excluí-la.'}
          </Notice>
          <Row style={{ marginTop: 12 }}>
            <Button
              title="Editar"
              icon="edit-2"
              onPress={() => navigation.navigate('PostForm', { id: post.id })}
              style={{ flex: 1 }}
            />
            <Button
              title="Excluir"
              icon="trash-2"
              variant="danger"
              loading={deleting}
              onPress={() => {
                handleDelete();
              }}
              style={{ flex: 1 }}
            />
          </Row>
        </>
      ) : null}

      <Comments
        postId={post.id}
        postOwnerId={post.authorId}
        onRequestLogin={() => navigation.navigate('Login')}
      />
    </Screen>
  );
}

const styles = (t) => ({
  title: {
    fontFamily: t.fonts.textBold,
    fontSize: 30,
    lineHeight: 35,
    color: t.colors.ink,
    marginBottom: t.space.sm,
  },
  meta: { fontFamily: t.fonts.ui, fontSize: t.type.small, color: t.colors.inkSoft, marginBottom: t.space.xl },
  author: { fontFamily: t.fonts.uiBold, color: t.colors.ink },
  body: { gap: t.space.lg },
  paragraph: {
    fontFamily: t.fonts.text,
    fontSize: t.type.reading,
    lineHeight: 30,
    color: t.colors.ink,
  },
});
