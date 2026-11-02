import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useStyles } from '../context/ThemeContext';
import api from '../services/api';
import { formatDate } from '../utils/format';
import { useConfirm } from './ConfirmDialog';
import { Button, IconButton, Notice, SkeletonLine, Tag, TextField } from './ui';

/**
 * Comentários de um post (requisito opcional 2).
 * Ler é público; comentar exige login (professor ou aluno);
 * remover: o professor dono do post ou o próprio autor do comentário.
 */
export default function Comments({ postId, postOwnerId, onRequestLogin }) {
  const s = useStyles(styles);
  const confirm = useConfirm();
  const { user, isAuthenticated, isTeacher } = useAuth();

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await api.listComments(postId, controller.signal);
        setComments(Array.isArray(data) ? data : []);
      } catch (error) {
        if (error.name !== 'AbortError') setLoadError(error.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [postId]);

  const canRemove = (comment) =>
    Boolean(user) &&
    ((comment.userId && comment.userId === user.id) ||
      (isTeacher && (postOwnerId === null || postOwnerId === user.id)));

  async function handleSend() {
    const text = content.trim();
    if (text.length < 2) {
      setFormError('Escreva pelo menos duas letras antes de enviar.');
      return;
    }
    setSending(true);
    setFormError(null);
    setFeedback(null);
    try {
      const created = await api.createComment(postId, text);
      setComments((current) => [...current, created]);
      setContent('');
      setFeedback('Comentário publicado.');
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(comment) {
    const ok = await confirm({
      title: 'Remover comentário?',
      message: `"${comment.content.slice(0, 80)}${comment.content.length > 80 ? '…' : ''}"`,
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (!ok) return;
    setFeedback(null);
    try {
      await api.deleteComment(comment.id);
      setComments((current) => current.filter((item) => item.id !== comment.id));
      setFeedback('Comentário removido.');
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <View style={s.section}>
      <Text style={s.heading} accessibilityRole="header">
        Comentários <Text style={s.count}>{loading ? '' : `(${comments.length})`}</Text>
      </Text>

      {loading ? (
        <View style={{ gap: 8 }}>
          <SkeletonLine width="40%" />
          <SkeletonLine />
        </View>
      ) : loadError ? (
        <Notice>{loadError}</Notice>
      ) : comments.length === 0 ? (
        <Text style={s.quiet}>Ninguém comentou ainda. Que tal começar a conversa?</Text>
      ) : (
        <View style={s.list}>
          {comments.map((comment) => (
            <View key={comment.id} style={s.entry} testID={`comment-${comment.id}`}>
              <View style={s.entryHead}>
                <View style={s.entryWho}>
                  <View style={s.nameLine}>
                    <Text style={s.whoName}>{comment.author}</Text>
                    <Tag tone={comment.role === 'professor' ? 'accent' : 'neutral'}>
                      {comment.role === 'professor' ? 'Professor' : 'Estudante'}
                    </Tag>
                  </View>
                  {formatDate(comment.createdAt) ? <Text style={s.who}>{formatDate(comment.createdAt)}</Text> : null}
                </View>
                {canRemove(comment) ? (
                  <IconButton
                    icon="trash-2"
                    size={17}
                    label={`Remover comentário de ${comment.author}`}
                    onPress={() => {
                      handleDelete(comment);
                    }}
                  />
                ) : null}
              </View>
              <Text style={s.text}>{comment.content}</Text>
            </View>
          ))}
        </View>
      )}

      {feedback ? <Notice tone="success">{feedback}</Notice> : null}

      {isAuthenticated ? (
        <View style={s.form}>
          <TextField
            label={`Comentar como ${user.name}`}
            value={content}
            onChangeText={(value) => {
              setContent(value);
              setFormError(null);
            }}
            placeholder="Uma dúvida, um complemento, um agradecimento…"
            multiline
            inputStyle={{ minHeight: 100 }}
            error={formError}
            maxLength={1000}
          />
          <Button title="Enviar comentário" icon="send" onPress={handleSend} loading={sending} />
        </View>
      ) : (
        <View style={s.loginBox}>
          <Text style={s.quiet}>Entre com sua conta de professor ou estudante para comentar.</Text>
          <Button title="Entrar para comentar" icon="log-in" variant="secondary" onPress={onRequestLogin} />
        </View>
      )}
    </View>
  );
}

const styles = (t) => ({
  section: { marginTop: t.space.xxl, gap: t.space.lg },
  heading: {
    fontFamily: t.fonts.textBold,
    fontSize: t.type.title,
    color: t.colors.ink,
    paddingBottom: t.space.sm,
    borderBottomWidth: 2,
    borderBottomColor: t.colors.rule,
  },
  count: { fontFamily: t.fonts.ui, fontSize: t.type.small, color: t.colors.inkSoft },
  list: { gap: t.space.lg },
  entry: { borderLeftWidth: 2, borderLeftColor: t.colors.rule, paddingLeft: t.space.md, gap: 4 },
  entryHead: { flexDirection: 'row', alignItems: 'flex-start', gap: t.space.sm },
  entryWho: { flex: 1, gap: 2 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm, flexWrap: 'wrap' },
  who: { fontFamily: t.fonts.ui, fontSize: t.type.small - 1, color: t.colors.inkSoft },
  whoName: { fontFamily: t.fonts.uiBold, fontSize: t.type.small, color: t.colors.ink },
  text: { fontFamily: t.fonts.text, fontSize: t.type.body + 1, lineHeight: 24, color: t.colors.ink },
  quiet: { fontFamily: t.fonts.ui, fontSize: t.type.small, color: t.colors.inkSoft, lineHeight: 20 },
  form: { gap: t.space.md },
  loginBox: { gap: t.space.md },
});
