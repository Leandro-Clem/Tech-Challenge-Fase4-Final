import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Screen from '../components/Screen';
import { Button, Lead, Notice, Ruled, SkeletonLine, TextField, Title } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../services/api';
import { roleLabels } from './roles';

const EMPTY = { name: '', username: '', email: '', password: '' };

export function validateUser(values, { editing }) {
  const errors = {};
  if (values.name.trim().length < 3) errors.name = 'Informe o nome completo (mínimo de 3 caracteres).';
  if (!/^[a-z0-9._-]{3,30}$/.test(values.username.trim().toLowerCase())) {
    errors.username = 'De 3 a 30 caracteres: letras, números, ponto, hífen ou sublinhado, sem espaços.';
  }
  if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'E-mail inválido.';
  }
  if (!editing || values.password) {
    if (values.password.length < 6) errors.password = 'A senha precisa ter pelo menos 6 caracteres.';
  }
  return errors;
}

/**
 * Requisitos 5, 6 e 8 — Cadastro e edição de professores e de alunos.
 * `route.params.role` define o papel; `route.params.id` (opcional) indica edição.
 * Na edição a senha é opcional: em branco, a senha atual é mantida.
 */
export default function UserFormScreen({ route, navigation }) {
  const { role, id } = route.params;
  const editing = Boolean(id);
  const labels = roleLabels(role);
  const resource = usersApi(role);
  const { user: me, refreshUser } = useAuth();

  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);

  useEffect(() => {
    navigation.setOptions({
      title: editing ? `Editar ${labels.singular.toLowerCase()}` : `Novo ${labels.singular.toLowerCase()}`,
    });
  }, [editing, labels.singular, navigation]);

  useEffect(() => {
    if (!editing) return undefined;
    const controller = new AbortController();
    (async () => {
      try {
        const person = await resource.get(id, controller.signal);
        setValues({ name: person.name, username: person.username, email: person.email || '', password: '' });
      } catch (err) {
        if (err.name !== 'AbortError') setServerError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [editing, id, resource]);

  const change = (field) => (text) => {
    setValues((current) => ({ ...current, [field]: text }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  async function handleSubmit() {
    const found = validateUser(values, { editing });
    setErrors(found);
    if (Object.keys(found).length) return;

    const payload = {
      name: values.name.trim(),
      username: values.username.trim().toLowerCase(),
      email: values.email.trim() || null,
    };
    if (values.password) payload.password = values.password;

    setSaving(true);
    setServerError(null);
    try {
      if (editing) await resource.update(id, payload);
      else await resource.create(payload);
      if (editing && id === me?.id) await refreshUser();
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
        <View style={{ gap: 14 }}>
          <SkeletonLine width="55%" height={26} />
          <SkeletonLine height={46} />
          <SkeletonLine height={46} />
          <SkeletonLine height={46} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen testID="user-form">
      <Ruled style={{ marginBottom: 24 }}>
        <Title>
          {editing ? `Editar ${labels.singular.toLowerCase()}` : `Cadastrar ${labels.singular.toLowerCase()}`}
        </Title>
        <Lead>
          {role === 'professor'
            ? 'Professores podem publicar aulas e administrar o aplicativo.'
            : 'Alunos leem as publicações e podem comentar.'}
        </Lead>
      </Ruled>

      <View style={{ gap: 18 }}>
        {serverError ? <Notice>{serverError}</Notice> : null}

        <TextField
          label="Nome completo"
          value={values.name}
          onChangeText={change('name')}
          error={errors.name}
          placeholder="Maria Souza"
          autoCapitalize="words"
          testID="user-name"
        />
        <TextField
          label="Usuário (para entrar)"
          value={values.username}
          onChangeText={change('username')}
          error={errors.username}
          placeholder="maria.souza"
          autoCapitalize="none"
          autoCorrect={false}
          testID="user-username"
        />
        <TextField
          label="E-mail (opcional)"
          value={values.email}
          onChangeText={change('email')}
          error={errors.email}
          placeholder="maria@escola.edu.br"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          testID="user-email"
        />
        <TextField
          label={editing ? 'Nova senha' : 'Senha'}
          value={values.password}
          onChangeText={change('password')}
          error={errors.password}
          hint={editing ? 'Deixe em branco para manter a senha atual.' : 'Mínimo de 6 caracteres.'}
          secureTextEntry
          autoCapitalize="none"
          testID="user-password"
        />

        <Button
          title={editing ? 'Salvar alterações' : `Cadastrar ${labels.singular.toLowerCase()}`}
          icon={editing ? 'check' : 'user-plus'}
          onPress={handleSubmit}
          loading={saving}
          testID="user-submit"
        />
        <Button title="Cancelar" variant="ghost" onPress={() => navigation.goBack()} disabled={saving} />
      </View>
    </Screen>
  );
}
