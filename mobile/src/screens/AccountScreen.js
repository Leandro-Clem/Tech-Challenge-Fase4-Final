import { Feather } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import Screen from '../components/Screen';
import { Avatar, Button, Divider, Lead, Ruled, Tag, Title } from '../components/ui';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useStyles, useTheme } from '../context/ThemeContext';

const THEME_OPTIONS = [
  { value: 'system', label: 'Sistema', icon: 'smartphone' },
  { value: 'light', label: 'Claro', icon: 'sun' },
  { value: 'dark', label: 'Escuro', icon: 'moon' },
];

/** Aba "Conta": perfil, tema e sair — ou o convite para entrar. */
export default function AccountScreen({ navigation }) {
  const s = useStyles(styles);
  const { theme, preference, setPreference } = useTheme();
  const { user, logout, isTeacher } = useAuth();

  return (
    <Screen>
      {user ? (
        <View style={s.profile}>
          <Avatar name={user.name} size={64} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.name}>{user.name}</Text>
            <Text style={s.username}>@{user.username}</Text>
            <Tag tone={isTeacher ? 'accent' : 'neutral'}>{isTeacher ? 'Professor' : 'Estudante'}</Tag>
          </View>
        </View>
      ) : (
        <Ruled>
          <Title>Você está navegando como visitante</Title>
          <Lead>Ler é livre. Entre para comentar ou, se for professor, publicar e administrar.</Lead>
          <Button
            title="Entrar"
            icon="log-in"
            onPress={() => navigation.navigate('Login')}
            style={{ marginTop: 20 }}
            testID="account-login"
          />
        </Ruled>
      )}

      <Divider />

      <Text style={s.section}>Aparência</Text>
      <View style={s.segment} accessibilityRole="radiogroup">
        {THEME_OPTIONS.map((option) => {
          const active = preference === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setPreference(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={`Tema ${option.label}`}
              style={[s.segmentItem, active && s.segmentActive]}
            >
              <Feather name={option.icon} size={16} color={active ? theme.colors.accent : theme.colors.inkSoft} />
              <Text style={[s.segmentText, active && s.segmentTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {user ? (
        <>
          <Divider />
          <Button title="Sair da conta" icon="log-out" variant="secondary" onPress={logout} testID="logout" />
        </>
      ) : null}

      <Text style={s.server}>Servidor: {API_URL}</Text>
    </Screen>
  );
}

const styles = (t) => ({
  profile: { flexDirection: 'row', alignItems: 'center', gap: t.space.lg },
  name: { fontFamily: t.fonts.textBold, fontSize: t.type.title, color: t.colors.ink },
  username: { fontFamily: t.fonts.ui, fontSize: t.type.small, color: t.colors.inkSoft },
  section: { fontFamily: t.fonts.uiBold, fontSize: t.type.small, color: t.colors.ink, marginBottom: t.space.sm },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: t.colors.rule,
    borderRadius: t.radius.md,
    overflow: 'hidden',
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: t.colors.sheet,
  },
  segmentActive: { backgroundColor: t.colors.accentSoft },
  segmentText: { fontFamily: t.fonts.uiMedium, fontSize: t.type.small, color: t.colors.inkSoft },
  segmentTextActive: { color: t.colors.accent },
  server: {
    marginTop: t.space.xxl,
    fontFamily: t.fonts.ui,
    fontSize: t.type.tiny,
    color: t.colors.inkFaint,
    textAlign: 'center',
  },
});
