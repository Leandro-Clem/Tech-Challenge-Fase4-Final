import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Screen from '../components/Screen';
import { Button, Lead, Notice, Ruled, TextField, Title } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useStyles } from '../context/ThemeContext';

/**
 * Requisito 10 — Login.
 *
 * Diferente da Fase 2/3, não existe mais seletor de perfil: a pessoa informa
 * usuário e SENHA, e o papel (professor/aluno) vem do cadastro no servidor.
 */
export default function LoginScreen({ navigation }) {
  const s = useStyles(styles);
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef(null);

  async function handleSubmit() {
    const found = {};
    if (username.trim().length < 3) found.username = 'Informe seu usuário.';
    if (password.length === 0) found.password = 'Informe sua senha.';
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    setServerError(null);
    try {
      await login(username, password);
      if (navigation.canGoBack()) navigation.goBack();
    } catch (err) {
      setServerError(err.message);
      setBusy(false);
    }
  }

  return (
    <Screen testID="login-screen">
      <Ruled style={{ marginBottom: 28 }}>
        <Title>Entrar</Title>
        <Lead>
          Professores entram para publicar e administrar. Estudantes podem ler sem conta e entrar
          para comentar.
        </Lead>
      </Ruled>

      <View style={s.panel}>
        {serverError ? <Notice>{serverError}</Notice> : null}

        <TextField
          label="Usuário"
          value={username}
          onChangeText={(text) => {
            setUsername(text);
            setErrors((e) => ({ ...e, username: undefined }));
          }}
          error={errors.username}
          placeholder="ex.: maria.souza"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          icon="user"
          testID="login-username"
        />

        <TextField
          ref={passwordRef}
          label="Senha"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setErrors((e) => ({ ...e, password: undefined }));
          }}
          error={errors.password}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
          icon="lock"
          testID="login-password"
        />
        <Button
          title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          icon={showPassword ? 'eye-off' : 'eye'}
          variant="ghost"
          compact
          onPress={() => setShowPassword((v) => !v)}
          style={{ alignSelf: 'flex-start', marginTop: -8 }}
        />

        <Button title="Entrar" icon="log-in" onPress={handleSubmit} loading={busy} testID="login-submit" />
      </View>

      <Text style={s.demo}>
        Primeiro acesso? A API cria contas de demonstração: <Text style={s.code}>professor</Text> /{' '}
        <Text style={s.code}>professor123</Text> e <Text style={s.code}>aluno</Text> /{' '}
        <Text style={s.code}>aluno123</Text>.
      </Text>
    </Screen>
  );
}

const styles = (t) => ({
  panel: {
    gap: 18,
    backgroundColor: t.colors.sheet,
    borderWidth: 1,
    borderColor: t.colors.rule,
    borderRadius: t.radius.md,
    padding: t.space.xl,
  },
  demo: {
    marginTop: t.space.xl,
    fontFamily: t.fonts.ui,
    fontSize: t.type.small - 1,
    lineHeight: 20,
    color: t.colors.inkSoft,
  },
  code: { fontFamily: t.fonts.uiBold, color: t.colors.ink },
});
