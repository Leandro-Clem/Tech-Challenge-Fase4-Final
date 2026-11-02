import { Feather } from '@expo/vector-icons';
import { forwardRef, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  Text as RNText,
  TextInput,
  View,
} from 'react-native';
import { useStyles, useTheme } from '../context/ThemeContext';
import { initials } from '../utils/format';

/* ------------------------------------------------------------------ */
/* Tipografia                                                          */
/* ------------------------------------------------------------------ */

export function Title({ children, style, ...rest }) {
  const s = useStyles(styles);
  return (
    <RNText accessibilityRole="header" style={[s.title, style]} {...rest}>
      {children}
    </RNText>
  );
}

export function Lead({ children, style }) {
  const s = useStyles(styles);
  return <RNText style={[s.lead, style]}>{children}</RNText>;
}

export function Text({ children, style, soft, small, bold, ...rest }) {
  const s = useStyles(styles);
  return (
    <RNText
      style={[s.text, soft && s.soft, small && s.small, bold && s.bold, style]}
      {...rest}
    >
      {children}
    </RNText>
  );
}

/** Bloco com a régua vertical na cor de destaque — a assinatura visual da Fase 3. */
export function Ruled({ children, style }) {
  const s = useStyles(styles);
  return <View style={[s.ruled, style]}>{children}</View>;
}

/* ------------------------------------------------------------------ */
/* Botões                                                              */
/* ------------------------------------------------------------------ */

/**
 * variant: 'primary' | 'secondary' | 'danger' | 'ghost'
 */
export function Button({
  title,
  onPress,
  icon,
  variant = 'primary',
  disabled = false,
  loading = false,
  compact = false,
  style,
  accessibilityLabel,
  testID,
}) {
  const s = useStyles(styles);
  const { theme } = useTheme();
  const off = disabled || loading;

  const color =
    variant === 'primary'
      ? theme.colors.onAccent
      : variant === 'danger'
        ? theme.colors.danger
        : theme.colors.ink;

  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: off, busy: loading }}
      testID={testID}
      style={({ pressed }) => [
        s.button,
        compact && s.buttonCompact,
        s[`button_${variant}`],
        pressed && !off && s.pressed,
        off && s.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        icon && <Feather name={icon} size={compact ? 15 : 17} color={color} />
      )}
      {title ? <RNText style={[s.buttonText, compact && s.buttonTextCompact, { color }]}>{title}</RNText> : null}
    </Pressable>
  );
}

/** Botão só com ícone (área de toque de 44pt, como recomendam as diretrizes de acessibilidade). */
export function IconButton({ icon, onPress, label, color, disabled, testID, size = 20 }) {
  const s = useStyles(styles);
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      testID={testID}
      style={({ pressed }) => [s.iconButton, pressed && s.pressed, disabled && s.disabled]}
    >
      <Feather name={icon} size={size} color={color || theme.colors.ink} />
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Formulário                                                          */
/* ------------------------------------------------------------------ */

export const TextField = forwardRef(function TextField(
  { label, error, hint, multiline, style, inputStyle, editable = true, icon, ...rest },
  ref,
) {
  const s = useStyles(styles);
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[s.field, style]}>
      {label ? <RNText style={s.label}>{label}</RNText> : null}
      <View
        style={[
          s.inputBox,
          multiline && s.inputBoxMultiline,
          focused && s.inputFocused,
          error && s.inputError,
          !editable && s.inputReadOnly,
        ]}
      >
        {icon ? <Feather name={icon} size={17} color={theme.colors.inkFaint} style={s.inputIcon} /> : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={theme.colors.inkFaint}
          multiline={multiline}
          editable={editable}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[s.input, multiline && s.inputMultiline, inputStyle]}
          {...rest}
        />
      </View>
      {error ? (
        <RNText style={s.fieldError} accessibilityLiveRegion="polite">
          {error}
        </RNText>
      ) : hint ? (
        <RNText style={s.hint}>{hint}</RNText>
      ) : null}
    </View>
  );
});

/* ------------------------------------------------------------------ */
/* Mensagens e estados                                                 */
/* ------------------------------------------------------------------ */

/** tone: 'danger' | 'success' | 'info' */
export function Notice({ children, tone = 'danger', style }) {
  const s = useStyles(styles);
  const { theme } = useTheme();
  const icon = tone === 'success' ? 'check-circle' : tone === 'info' ? 'info' : 'alert-circle';
  const color =
    tone === 'success' ? theme.colors.success : tone === 'info' ? theme.colors.accent : theme.colors.danger;
  return (
    <View
      style={[s.notice, s[`notice_${tone}`], style]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Feather name={icon} size={17} color={color} style={{ marginTop: 1 }} />
      <RNText style={[s.noticeText, { color: theme.colors.ink }]}>{children}</RNText>
    </View>
  );
}

export function Empty({ icon = 'inbox', title, children, action }) {
  const s = useStyles(styles);
  const { theme } = useTheme();
  return (
    <View style={s.empty}>
      <Feather name={icon} size={30} color={theme.colors.inkFaint} />
      <RNText style={s.emptyTitle}>{title}</RNText>
      {children ? <RNText style={s.emptyText}>{children}</RNText> : null}
      {action || null}
    </View>
  );
}

/** Linha "esqueleto" pulsante enquanto os dados carregam. */
export function SkeletonLine({ width = '100%', height = 14, style }) {
  const s = useStyles(styles);
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[s.skeleton, { width, height, opacity }, style]} />;
}

export function SkeletonList({ rows = 4 }) {
  return (
    <View accessibilityLabel="Carregando" style={{ gap: 22, paddingVertical: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <View key={i} style={{ gap: 8 }}>
          <SkeletonLine width="70%" height={20} />
          <SkeletonLine width="35%" height={12} />
          <SkeletonLine />
          <SkeletonLine width="85%" />
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Pequenos elementos                                                  */
/* ------------------------------------------------------------------ */

export function Avatar({ name, size = 40 }) {
  const s = useStyles(styles);
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <RNText style={[s.avatarText, { fontSize: size * 0.38 }]}>{initials(name)}</RNText>
    </View>
  );
}

export function Tag({ children, tone = 'neutral' }) {
  const s = useStyles(styles);
  return (
    <View style={[s.tag, tone === 'accent' && s.tagAccent]}>
      <RNText style={[s.tagText, tone === 'accent' && s.tagTextAccent]}>{children}</RNText>
    </View>
  );
}

export function Divider({ style }) {
  const s = useStyles(styles);
  return <View style={[s.divider, style]} />;
}

export function Row({ children, style }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }, style]}>{children}</View>;
}

/* ------------------------------------------------------------------ */

const styles = (t) => ({
  title: {
    fontFamily: t.fonts.textBold,
    fontSize: t.type.display,
    lineHeight: t.type.display * 1.15,
    color: t.colors.ink,
    marginBottom: t.space.sm,
  },
  lead: {
    fontFamily: t.fonts.text,
    fontSize: t.type.body + 1,
    lineHeight: 25,
    color: t.colors.inkSoft,
  },
  text: { fontFamily: t.fonts.ui, fontSize: t.type.body, color: t.colors.ink },
  soft: { color: t.colors.inkSoft },
  small: { fontSize: t.type.small },
  bold: { fontFamily: t.fonts.uiBold },

  ruled: {
    borderLeftWidth: 3,
    borderLeftColor: t.colors.accent,
    paddingLeft: t.space.lg,
  },

  button: {
    minHeight: 46,
    paddingHorizontal: t.space.lg,
    borderRadius: t.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.space.sm,
    borderWidth: 1,
  },
  buttonCompact: { minHeight: 36, paddingHorizontal: t.space.md },
  button_primary: { backgroundColor: t.colors.accent, borderColor: t.colors.accent },
  button_secondary: { backgroundColor: t.colors.sheet, borderColor: t.colors.rule },
  button_danger: { backgroundColor: t.colors.dangerSoft, borderColor: t.colors.dangerSoft },
  button_ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  buttonText: { fontFamily: t.fonts.uiMedium, fontSize: t.type.body },
  buttonTextCompact: { fontSize: t.type.small },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.45 },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radius.pill,
  },

  field: { gap: 6 },
  label: { fontFamily: t.fonts.uiMedium, fontSize: t.type.small, color: t.colors.ink },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: t.colors.rule,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.sheet,
    paddingHorizontal: t.space.md,
  },
  inputBoxMultiline: { alignItems: 'flex-start' },
  inputFocused: { borderColor: t.colors.accent },
  inputError: { borderColor: t.colors.danger },
  inputReadOnly: { backgroundColor: t.colors.wash },
  inputIcon: { marginRight: t.space.sm },
  input: {
    flex: 1,
    minHeight: 46,
    fontFamily: t.fonts.ui,
    fontSize: t.type.body,
    color: t.colors.ink,
    paddingVertical: 10,
    // Na web o navegador desenha um contorno próprio no foco; a borda do inputBox já indica o foco.
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : null),
  },
  inputMultiline: {
    minHeight: 200,
    fontFamily: t.fonts.text,
    fontSize: t.type.reading - 1,
    lineHeight: 26,
  },
  fieldError: { fontFamily: t.fonts.ui, fontSize: t.type.small - 1, color: t.colors.danger },
  hint: { fontFamily: t.fonts.ui, fontSize: t.type.small - 1, color: t.colors.inkSoft },

  notice: {
    flexDirection: 'row',
    gap: t.space.sm,
    padding: t.space.md,
    borderRadius: t.radius.md,
    borderLeftWidth: 3,
  },
  notice_danger: { backgroundColor: t.colors.dangerSoft, borderLeftColor: t.colors.danger },
  notice_success: { backgroundColor: t.colors.successSoft, borderLeftColor: t.colors.success },
  notice_info: { backgroundColor: t.colors.accentSoft, borderLeftColor: t.colors.accent },
  noticeText: { flex: 1, fontFamily: t.fonts.ui, fontSize: t.type.small, lineHeight: 20 },

  empty: { alignItems: 'center', paddingVertical: t.space.xxl, paddingHorizontal: t.space.lg, gap: t.space.sm },
  emptyTitle: { fontFamily: t.fonts.textBold, fontSize: t.type.heading + 2, color: t.colors.ink, textAlign: 'center' },
  emptyText: { fontFamily: t.fonts.ui, fontSize: t.type.small, color: t.colors.inkSoft, textAlign: 'center', lineHeight: 20 },

  skeleton: { backgroundColor: t.colors.wash, borderRadius: t.radius.sm },

  avatar: { backgroundColor: t.colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: t.fonts.uiBold, color: t.colors.accent },

  tag: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: t.colors.rule,
    borderRadius: t.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagAccent: { backgroundColor: t.colors.accentSoft, borderColor: t.colors.accentSoft },
  tagText: { fontFamily: t.fonts.ui, fontSize: t.type.tiny, color: t.colors.inkSoft },
  tagTextAccent: { color: t.colors.accent },

  divider: { height: 1, backgroundColor: t.colors.rule, marginVertical: t.space.xl },
});
