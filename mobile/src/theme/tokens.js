/**
 * Tokens de design — os mesmos nomes e a mesma paleta "grafite" do front-end web
 * da Fase 3, para que web e mobile pareçam o mesmo produto.
 *
 * `accent` é a cor de identidade (régua lateral, item ativo, foco).
 * `danger` é reservada a erro e exclusão.
 */
export const palettes = {
  light: {
    paper: '#F6F6F4',
    sheet: '#FFFFFF',
    ink: '#1B1B1B',
    inkSoft: '#585856',
    inkFaint: '#8C8C89',
    rule: '#DEDEDA',
    wash: 'rgba(0, 0, 0, 0.05)',
    accent: '#2B54C6',
    accentSoft: '#E4E9F9',
    onAccent: '#FFFFFF',
    danger: '#BE3B2B',
    dangerSoft: '#F8E4E1',
    highlight: '#FFE9A3',
    success: '#1E7A4C',
    successSoft: '#E1F0E8',
    overlay: 'rgba(0, 0, 0, 0.45)',
  },
  dark: {
    paper: '#121213',
    sheet: '#1C1C1E',
    ink: '#EDEDEB',
    inkSoft: '#A3A3A0',
    inkFaint: '#77777A',
    rule: '#333336',
    wash: 'rgba(255, 255, 255, 0.07)',
    accent: '#87A4FF',
    accentSoft: '#1E2436',
    onAccent: '#0E1530',
    danger: '#F0806E',
    dangerSoft: '#38211E',
    highlight: '#E3CE73',
    success: '#6FC896',
    successSoft: '#1E2F26',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
};

/**
 * Famílias carregadas em App.js com expo-font. Se a fonte ainda não carregou
 * (ou nos testes), o React Native cai na fonte do sistema sem erro.
 */
export const fonts = {
  text: 'Newsreader_400Regular',
  textItalic: 'Newsreader_400Regular_Italic',
  textBold: 'Newsreader_600SemiBold',
  ui: 'IBMPlexSans_400Regular',
  uiMedium: 'IBMPlexSans_500Medium',
  uiBold: 'IBMPlexSans_600SemiBold',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 2, md: 4, lg: 8, pill: 999 };

export const type = {
  display: 30,
  title: 22,
  heading: 18,
  body: 16,
  reading: 18,
  small: 14,
  tiny: 12,
};

export function buildTheme(mode) {
  return {
    mode,
    colors: palettes[mode] ?? palettes.light,
    fonts,
    space,
    radius,
    type,
  };
}
