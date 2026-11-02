import { Text, View } from 'react-native';
import { useStyles } from '../context/ThemeContext';
import { Button } from './ui';

/** Controle "Anterior · Página X de Y · Próxima" das listas de professores e alunos. */
export default function Pagination({ page, totalPages, total, onChange, disabled }) {
  const s = useStyles(styles);
  if (!totalPages || totalPages <= 1) {
    return total !== undefined ? <Text style={s.count}>{total} no total</Text> : null;
  }

  return (
    <View style={s.root}>
      <Button
        title="Anterior"
        icon="chevron-left"
        variant="secondary"
        compact
        disabled={disabled || page <= 1}
        onPress={() => onChange(page - 1)}
        accessibilityLabel="Página anterior"
      />
      <Text style={s.label} accessibilityLiveRegion="polite">
        Página {page} de {totalPages}
      </Text>
      <Button
        title="Próxima"
        icon="chevron-right"
        variant="secondary"
        compact
        disabled={disabled || page >= totalPages}
        onPress={() => onChange(page + 1)}
        accessibilityLabel="Próxima página"
      />
    </View>
  );
}

const styles = (t) => ({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: t.space.lg,
    gap: t.space.sm,
  },
  label: { fontFamily: t.fonts.uiMedium, fontSize: t.type.small, color: t.colors.inkSoft },
  count: {
    fontFamily: t.fonts.ui,
    fontSize: t.type.small,
    color: t.colors.inkSoft,
    textAlign: 'center',
    paddingVertical: t.space.lg,
  },
});
