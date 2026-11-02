/* eslint-env jest */

// Armazenamento em memória no lugar do AsyncStorage/SecureStore nativos.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    getItemAsync: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
    setItemAsync: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key) => {
      store.delete(key);
    }),
  };
});

// Os ícones carregam arquivos de fonte; nos testes basta um elemento simples.
jest.mock('@expo/vector-icons', () => {
  const { Text } = jest.requireActual('react-native');
  const Icon = ({ name }) => <Text accessible={false}>{`[${name}]`}</Text>;
  return { Feather: Icon };
});

// useFocusEffect exige um navegador montado; nos testes de tela ele vira um useEffect.
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const { useEffect } = jest.requireActual('react');
  return {
    ...actual,
    useFocusEffect: (callback) => useEffect(callback, [callback]),
  };
});
