import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AccountScreen from '../screens/AccountScreen';
import AdminHomeScreen from '../screens/AdminHomeScreen';
import AdminPostsScreen from '../screens/AdminPostsScreen';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import PostFormScreen from '../screens/PostFormScreen';
import UserFormScreen from '../screens/UserFormScreen';
import UsersListScreen from '../screens/UsersListScreen';

const Root = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();
const PostsStack = createNativeStackNavigator();
const AdminStack = createNativeStackNavigator();
const AccountStack = createNativeStackNavigator();

/**
 * Autorização na navegação:
 * as telas de criação/edição e toda a aba "Gerenciar" só são REGISTRADAS
 * quando o usuário logado é professor. Para um aluno ou visitante essas rotas
 * simplesmente não existem — não há como navegar até elas. Se o professor sair,
 * as telas são desmontadas e o app volta para a lista de posts.
 * (A API valida de novo cada operação; a interface só evita o caminho.)
 */
function useStackOptions() {
  const { theme } = useTheme();
  return {
    headerStyle: { backgroundColor: theme.colors.sheet },
    headerTintColor: theme.colors.ink,
    headerTitleStyle: { fontFamily: theme.fonts.uiBold, fontSize: 17 },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: theme.colors.paper },
    headerBackButtonDisplayMode: 'minimal',
  };
}

function PostsNavigator() {
  const { isTeacher } = useAuth();
  const options = useStackOptions();
  return (
    <PostsStack.Navigator screenOptions={options}>
      <PostsStack.Screen name="Home" component={HomeScreen} options={{ title: 'Sala de Aula Aberta' }} />
      <PostsStack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: '' }} />
      {isTeacher ? (
        <PostsStack.Screen name="PostForm" component={PostFormScreen} options={{ title: 'Publicação' }} />
      ) : null}
    </PostsStack.Navigator>
  );
}

function AdminNavigator() {
  const options = useStackOptions();
  return (
    <AdminStack.Navigator screenOptions={options}>
      <AdminStack.Screen name="AdminHome" component={AdminHomeScreen} options={{ title: 'Gerenciar' }} />
      <AdminStack.Screen name="AdminPosts" component={AdminPostsScreen} options={{ title: 'Publicações' }} />
      <AdminStack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: '' }} />
      <AdminStack.Screen name="PostForm" component={PostFormScreen} options={{ title: 'Publicação' }} />
      <AdminStack.Screen name="UsersList" component={UsersListScreen} options={{ title: 'Usuários' }} />
      <AdminStack.Screen name="UserForm" component={UserFormScreen} options={{ title: 'Cadastro' }} />
    </AdminStack.Navigator>
  );
}

function AccountNavigator() {
  const options = useStackOptions();
  return (
    <AccountStack.Navigator screenOptions={options}>
      <AccountStack.Screen name="Account" component={AccountScreen} options={{ title: 'Conta' }} />
    </AccountStack.Navigator>
  );
}

const TAB_ICONS = { Posts: 'book-open', Admin: 'sliders', Conta: 'user' };

function TabsNavigator() {
  const { theme } = useTheme();
  const { isTeacher } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.inkSoft,
        tabBarStyle: {
          backgroundColor: theme.colors.sheet,
          borderTopColor: theme.colors.rule,
          height: 64 + insets.bottom,
          paddingTop: 4,
          paddingBottom: 4 + insets.bottom,
        },
        tabBarLabelStyle: { fontFamily: theme.fonts.uiMedium, fontSize: 12, lineHeight: 16, flexShrink: 0 },
        tabBarIcon: ({ color, size }) => <Feather name={TAB_ICONS[route.name]} color={color} size={size - 2} />,
      })}
    >
      <Tabs.Screen name="Posts" component={PostsNavigator} options={{ title: 'Publicações' }} />
      {isTeacher ? (
        <Tabs.Screen name="Admin" component={AdminNavigator} options={{ title: 'Gerenciar' }} />
      ) : null}
      <Tabs.Screen name="Conta" component={AccountNavigator} options={{ title: 'Conta' }} />
    </Tabs.Navigator>
  );
}

export default function RootNavigator() {
  const { restoring } = useAuth();
  const { theme } = useTheme();
  const options = useStackOptions();

  // Enquanto o token salvo é validado, mostra só um indicador — evita "piscar" a interface de visitante.
  if (restoring) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.paper }}>
        <ActivityIndicator color={theme.colors.accent} size="large" />
      </View>
    );
  }

  return (
    <Root.Navigator screenOptions={options}>
      <Root.Screen name="Tabs" component={TabsNavigator} options={{ headerShown: false }} />
      <Root.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: 'Entrar', presentation: 'modal' }}
      />
    </Root.Navigator>
  );
}
