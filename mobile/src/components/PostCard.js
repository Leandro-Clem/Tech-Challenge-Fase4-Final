import { Pressable, Text, View } from 'react-native';
import { useStyles } from '../context/ThemeContext';
import { excerpt, formatDate, readingTime } from '../utils/format';

/**
 * Item da lista de posts: título, autor e uma breve descrição (requisito 1).
 * O primeiro item da home aparece em destaque, como no site da Fase 3.
 */
export default function PostCard({ post, onPress, featured = false }) {
  const s = useStyles(styles);
  const date = formatDate(post.createdAt);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${post.title}, por ${post.author}`}
      accessibilityHint="Abre a publicação completa"
      style={({ pressed }) => [s.item, pressed && s.pressed]}
      testID={`post-${post.id}`}
    >
      {featured ? <Text style={s.kicker}>Mais recente</Text> : null}
      <Text style={[s.title, featured && s.titleFeatured]}>{post.title}</Text>
      <Text style={s.meta}>
        <Text style={s.author}>{post.author}</Text>
        {date ? ` · ${date}` : ''} · {readingTime(post.content)} min de leitura
      </Text>
      <Text style={[s.excerpt, featured && s.excerptFeatured]} numberOfLines={featured ? 5 : 3}>
        {excerpt(post.content, featured ? 220 : 140)}
      </Text>
    </Pressable>
  );
}

export function PostCardSeparator() {
  const s = useStyles(styles);
  return <View style={s.separator} />;
}

const styles = (t) => ({
  item: { paddingVertical: t.space.lg, gap: 6 },
  pressed: { opacity: 0.6 },
  kicker: {
    fontFamily: t.fonts.uiBold,
    fontSize: t.type.tiny,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: t.colors.accent,
  },
  title: {
    fontFamily: t.fonts.textBold,
    fontSize: t.type.heading + 2,
    lineHeight: 26,
    color: t.colors.ink,
  },
  titleFeatured: { fontSize: 26, lineHeight: 31 },
  meta: { fontFamily: t.fonts.ui, fontSize: t.type.small - 1, color: t.colors.inkSoft },
  author: { fontFamily: t.fonts.uiBold, color: t.colors.ink },
  excerpt: {
    fontFamily: t.fonts.text,
    fontSize: t.type.body,
    lineHeight: 23,
    color: t.colors.inkSoft,
  },
  excerptFeatured: { fontSize: t.type.reading - 1, lineHeight: 25 },
  separator: { height: 1, backgroundColor: t.colors.rule },
});
