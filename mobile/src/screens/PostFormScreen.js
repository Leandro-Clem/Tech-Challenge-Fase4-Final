import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Screen from '../components/Screen';
import { Button, Lead, Notice, Ruled, SkeletonLine, TextField, Title } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export function validatePost(values) {
  const errors = {};
  if (values.title.trim().length < 3) errors.title = 'O título precisa de pelo menos 3 caracteres.';
  if (values.content.trim().length < 10) errors.content = 'Escreva um conteúdo com pelo menos 10 caracteres.';
  return errors;
}

/**
 * Requisitos 3 e 4 — Criação e edição de postagens (mesma tela).
 * Sem `route.params.id` cria; com id carrega o post atual e salva as alterações.
 *
 * O campo "Autor" aparece preenchido e bloqueado: a API define a autoria
 * pelo usuário logado, e é ela que decide quem pode alterar o post depois.
 */
export default function PostFormScreen({ route, navigation }) {
  const id = route.params?.id;
  const editing = Boolean(id);
  const { user } = useAuth();

  const [values, setValues] = useState({ title: '', content: '', author: user?.name ?? '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);
  const contentRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({ title: editing ? 'Editar publicação' : 'Nova publicação' });
  }, [editing, navigation]);

  useEffect(() => {
    if (!editing) return undefined;
    const controller = new AbortController();
    (async () => {
      try {
        const post = await api.getPost(id, controller.signal);
        setValues({ title: post.title, content: post.content, author: post.author });
      } catch (err) {
        if (err.name !== 'AbortError') setServerError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [editing, id]);

  const change = (field) => (text) => {
    setValues((current) => ({ ...current, [field]: text }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  async function handleSubmit() {
    const found = validatePost(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setServerError(null);
    const payload = { title: values.title.trim(), content: values.content.trim() };
    try {
      if (editing) await api.updatePost(id, payload);
      else await api.createPost(payload);
      navigation.goBack();
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      setServerError(err.message);
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <View style={{ gap: 14 }} accessibilityLabel="Carregando publicação">
          <SkeletonLine width="50%" height={26} />
          <SkeletonLine height={46} />
          <SkeletonLine height={200} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen testID="post-form">
      <Ruled style={{ marginBottom: 24 }}>
        <Title>{editing ? 'Editar publicação' : 'Nova publicação'}</Title>
        <Lead>
          {editing
            ? 'Ajuste o título ou o conteúdo. A data de publicação original é mantida.'
            : 'Escreva para seus alunos. Separe parágrafos com uma linha em branco.'}
        </Lead>
      </Ruled>

      <View style={{ gap: 18 }}>
        {serverError ? <Notice>{serverError}</Notice> : null}

        <TextField
          label="Título"
          value={values.title}
          onChangeText={change('title')}
          error={errors.title}
          placeholder="Ex.: Revisão de frações para a prova"
          returnKeyType="next"
          onSubmitEditing={() => contentRef.current?.focus()}
          maxLength={200}
          testID="post-title"
        />

        <TextField
          ref={contentRef}
          label="Conteúdo"
          value={values.content}
          onChangeText={change('content')}
          error={errors.content}
          placeholder="O texto completo da aula, resumo ou material…"
          multiline
          testID="post-content"
        />

        <TextField
          label="Autor"
          value={values.author}
          editable={false}
          hint="Definido pela sua conta de professor e não pode ser alterado."
          testID="post-author"
        />

        <Button
          title={editing ? 'Salvar alterações' : 'Publicar'}
          icon={editing ? 'check' : 'send'}
          onPress={handleSubmit}
          loading={saving}
          testID="post-submit"
        />
        <Button title="Cancelar" variant="ghost" onPress={() => navigation.goBack()} disabled={saving} />
      </View>
    </Screen>
  );
}
