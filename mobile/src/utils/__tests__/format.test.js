import { resolveApiUrl } from '../../config';
import { excerpt, formatDate, initials, plural, readingTime } from '../format';

describe('format', () => {
  test('formatDate em português', () => {
    expect(formatDate('2026-03-12T15:00:00')).toBe('12 de março de 2026');
    expect(formatDate('')).toBe('');
    expect(formatDate('não é data')).toBe('');
  });

  test('excerpt corta na palavra inteira', () => {
    expect(excerpt('curto')).toBe('curto');
    const result = excerpt('uma frase bem longa para cortar', 15);
    expect(result).toBe('uma frase bem…');
  });

  test('readingTime tem mínimo de 1 minuto', () => {
    expect(readingTime('poucas palavras')).toBe(1);
    expect(readingTime('palavra '.repeat(600))).toBe(3);
  });

  test('initials', () => {
    expect(initials('Maria da Silva Souza')).toBe('MS');
    expect(initials('Pedro')).toBe('P');
    expect(initials('')).toBe('?');
  });

  test('plural', () => {
    expect(plural(1, 'post', 'posts')).toBe('1 post');
    expect(plural(3, 'post', 'posts')).toBe('3 posts');
  });
});

describe('resolveApiUrl', () => {
  test('usa EXPO_PUBLIC_API_URL quando definido', () => {
    expect(resolveApiUrl({ envUrl: 'http://10.0.0.5:3000/' })).toBe('http://10.0.0.5:3000');
  });

  test('no Expo Go usa o IP da máquina que serve o Metro', () => {
    expect(resolveApiUrl({ envUrl: '', hostUri: '192.168.0.12:8081', os: 'android' })).toBe('http://192.168.0.12:3000');
  });

  test('emulador Android sem hostUri usa 10.0.2.2', () => {
    expect(resolveApiUrl({ envUrl: '', hostUri: undefined, os: 'android' })).toBe('http://10.0.2.2:3000');
  });

  test('web/iOS simulador caem em localhost', () => {
    expect(resolveApiUrl({ envUrl: '', hostUri: 'localhost:8081', os: 'ios' })).toBe('http://localhost:3000');
  });
});
