import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useStyles } from '../context/ThemeContext';
import { Button } from './ui';

const ConfirmContext = createContext(null);

/**
 * Diálogo de confirmação próprio, em vez de Alert.alert:
 * - funciona igual em Android, iOS e web (na web o Alert não tem botões);
 * - segue o tema claro/escuro;
 * - é testável com a Testing Library.
 *
 * Uso: const confirm = useConfirm();
 *      if (await confirm({ title, message, confirmLabel, destructive: true })) { ... }
 */
export function ConfirmProvider({ children }) {
  const s = useStyles(styles);
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setDialog({ confirmLabel: 'Confirmar', cancelLabel: 'Cancelar', ...options });
      }),
    [],
  );

  const close = useCallback((answer) => {
    resolver.current?.(answer);
    resolver.current = null;
    setDialog(null);
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        visible={Boolean(dialog)}
        transparent
        animationType="fade"
        onRequestClose={() => close(false)}
      >
        <Pressable style={s.backdrop} onPress={() => close(false)} accessibilityLabel="Fechar">
          <Pressable style={s.card} onPress={() => {}} accessibilityViewIsModal>
            <Text style={s.title} accessibilityRole="header">
              {dialog?.title}
            </Text>
            {dialog?.message ? <Text style={s.message}>{dialog.message}</Text> : null}
            <View style={s.actions}>
              <Button
                title={dialog?.cancelLabel}
                variant="secondary"
                onPress={() => close(false)}
                style={s.action}
              />
              <Button
                title={dialog?.confirmLabel}
                variant={dialog?.destructive ? 'danger' : 'primary'}
                icon={dialog?.destructive ? 'trash-2' : 'check'}
                onPress={() => close(true)}
                style={s.action}
                testID="confirm-dialog-ok"
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm precisa estar dentro de <ConfirmProvider>.');
  return confirm;
}

const styles = (t) => ({
  backdrop: {
    flex: 1,
    backgroundColor: t.colors.overlay,
    justifyContent: 'center',
    padding: t.space.xl,
  },
  card: {
    backgroundColor: t.colors.sheet,
    borderRadius: t.radius.lg,
    padding: t.space.xl,
    gap: t.space.md,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  title: { fontFamily: t.fonts.textBold, fontSize: t.type.title, color: t.colors.ink },
  message: { fontFamily: t.fonts.ui, fontSize: t.type.body - 1, lineHeight: 22, color: t.colors.inkSoft },
  actions: { flexDirection: 'row', gap: t.space.sm, marginTop: t.space.sm },
  action: { flex: 1 },
});
