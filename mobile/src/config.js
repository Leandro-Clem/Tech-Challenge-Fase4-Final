import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Descobre o endereço da API.
 *
 * 1. EXPO_PUBLIC_API_URL no arquivo .env tem prioridade (ex.: http://192.168.0.10:3000).
 * 2. Sem .env, usa o mesmo IP da máquina que está servindo o Metro: quando o
 *    celular abre o app pelo Expo Go, `hostUri` é algo como "192.168.0.10:8081",
 *    e a API roda nessa mesma máquina na porta 3000.
 * 3. Último recurso: emulador Android enxerga o host em 10.0.2.2; web/iOS em localhost.
 */
export function resolveApiUrl({
  envUrl = process.env.EXPO_PUBLIC_API_URL,
  hostUri = Constants.expoConfig?.hostUri,
  os = Platform.OS,
  port = 3000,
} = {}) {
  if (envUrl) return envUrl.replace(/\/+$/, '');

  const host = hostUri ? hostUri.split(':')[0] : null;
  if (host && host !== 'localhost' && host !== '127.0.0.1') return `http://${host}:${port}`;

  if (os === 'android') return `http://10.0.2.2:${port}`;
  return `http://localhost:${port}`;
}

export const API_URL = resolveApiUrl();
