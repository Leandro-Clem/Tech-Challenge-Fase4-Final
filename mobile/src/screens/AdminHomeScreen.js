import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Screen from '../components/Screen';
import { Lead, Ruled, Title } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useStyles, useTheme } from '../context/ThemeContext';
import api from '../services/api';

/** Ponto de entrada da área administrativa (aba "Gerenciar", só para professores). */
export default function AdminHomeScreen({ navigation }) {
  const s = useStyles(styles);
  const { theme } = useTheme();
  const { user } = useAuth();
  const [counts, setCounts] = useState({});

  // Totais exibidos nos atalhos — atualizados sempre que a aba volta ao foco.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.allSettled([
        api.listPosts(),
        api.teachers.list({ page: 1, limit: 1 }),
        api.students.list({ page: 1, limit: 1 }),
      ]).then(([posts, teachers, students]) => {
        if (!active) return;
        setCounts({
          posts: posts.status === 'fulfilled' ? posts.value.length : undefined,
          teachers: teachers.status === 'fulfilled' ? teachers.value.total : undefined,
          students: students.status === 'fulfilled' ? students.value.total : undefined,
        });
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const items = [
    { key: 'posts', icon: 'file-text', title: 'Publicações', text: 'Editar e excluir posts', go: () => navigation.navigate('AdminPosts'), count: counts.posts },
    { key: 'teachers', icon: 'briefcase', title: 'Professores', text: 'Cadastrar, editar e excluir docentes', go: () => navigation.navigate('UsersList', { role: 'professor' }), count: counts.teachers },
    { key: 'students', icon: 'users', title: 'Alunos', text: 'Cadastrar, editar e excluir estudantes', go: () => navigation.navigate('UsersList', { role: 'aluno' }), count: counts.students },
    { key: 'new', icon: 'edit-3', title: 'Nova publicação', text: 'Escrever uma aula ou material', go: () => navigation.navigate('PostForm') },
  ];

  return (
    <Screen>
      <Ruled style={{ marginBottom: 24 }}>
        <Title>Olá, {user?.name?.split(' ')[0]}</Title>
        <Lead>O que você quer administrar?</Lead>
      </Ruled>

      <View style={s.grid}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            onPress={item.go}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            style={({ pressed }) => [s.card, pressed && { opacity: 0.7 }]}
            testID={`admin-${item.key}`}
          >
            <View style={s.iconBox}>
              <Feather name={item.icon} size={20} color={theme.colors.accent} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.cardTitle}>{item.title}</Text>
              <Text style={s.cardText}>{item.text}</Text>
            </View>
            {item.count !== undefined ? <Text style={s.count}>{item.count}</Text> : null}
            <Feather name="chevron-right" size={20} color={theme.colors.inkFaint} />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = (t) => ({
  grid: { gap: t.space.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    padding: t.space.lg,
    backgroundColor: t.colors.sheet,
    borderWidth: 1,
    borderColor: t.colors.rule,
    borderRadius: t.radius.lg,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontFamily: t.fonts.uiBold, fontSize: t.type.body, color: t.colors.ink },
  cardText: { fontFamily: t.fonts.ui, fontSize: t.type.small - 1, color: t.colors.inkSoft },
  count: { fontFamily: t.fonts.textBold, fontSize: t.type.title, color: t.colors.ink },
});
