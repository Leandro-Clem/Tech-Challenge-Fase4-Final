import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Guarda pequenos valores (o token JWT e a preferência de tema).
 *
 * No celular o token vai para o SecureStore (Keychain no iOS, Keystore no Android),
 * que é criptografado pelo sistema. Na web o SecureStore não existe, então caímos
 * para o AsyncStorage (localStorage). Toda falha é silenciosa: sem armazenamento,
 * a sessão simplesmente vive só em memória.
 */
const useSecure = Platform.OS !== 'web';

export async function getItem(key) {
  try {
    return useSecure ? await SecureStore.getItemAsync(key) : await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setItem(key, value) {
  try {
    if (value === null || value === undefined) {
      if (useSecure) await SecureStore.deleteItemAsync(key);
      else await AsyncStorage.removeItem(key);
      return;
    }
    if (useSecure) await SecureStore.setItemAsync(key, String(value));
    else await AsyncStorage.setItem(key, String(value));
  } catch {
    /* sem armazenamento disponível: segue só em memória */
  }
}
