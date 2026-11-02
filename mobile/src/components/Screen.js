import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useStyles } from '../context/ThemeContext';

/**
 * Moldura padrão das telas com rolagem: fundo do tema, margens e
 * teclado que não cobre o campo em foco.
 */
export default function Screen({ children, scroll = true, refreshControl, contentStyle, testID }) {
  const s = useStyles(styles);

  if (!scroll) return <View style={[s.root, s.content, contentStyle]}>{children}</View>;

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        testID={testID}
        style={s.root}
        contentContainerStyle={[s.content, contentStyle]}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}
      >
        <View style={s.inner}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (t) => ({
  root: { flex: 1, backgroundColor: t.colors.paper },
  content: { padding: t.space.lg, paddingBottom: t.space.xxl * 2 },
  // Em tablets e na web a leitura fica numa coluna confortável, como no site da Fase 3.
  inner: { width: '100%', maxWidth: 720, alignSelf: 'center' },
});
