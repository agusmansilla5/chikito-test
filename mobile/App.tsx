import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LocationProvider } from './src/context/LocationContext';
import LoginScreen from './src/screens/LoginScreen';
import ProductListScreen from './src/screens/ProductListScreen';
import AddMovementScreen from './src/screens/AddMovementScreen';
import AddProductScreen from './src/screens/AddProductScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import AuditsScreen from './src/screens/AuditsScreen';
import AuditDetailScreen from './src/screens/AuditDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { HeaderBar } from './src/components/HeaderBar';
import type { RootStackParamList } from './src/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { session, loading } = useAuth();
  const { mode, colors } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  const navTheme = {
    ...(mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator initialRouteName="Reports" screenOptions={{ headerShown: true }}>
        <Stack.Screen
          name="Reports"
          component={ReportsScreen}
          options={{ title: 'Panel de control', headerRight: HeaderBar }}
        />
        <Stack.Screen
          name="Audits"
          component={AuditsScreen}
          options={{ title: 'Auditorías', headerRight: HeaderBar }}
        />
        <Stack.Screen
          name="ProductList"
          component={ProductListScreen}
          options={{ title: 'Productos', headerRight: HeaderBar }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Configuración', headerRight: HeaderBar }}
        />
        <Stack.Screen name="AddMovement" component={AddMovementScreen} options={{ title: 'Movimiento / producto' }} />
        <Stack.Screen name="AddProduct" component={AddProductScreen} options={{ title: 'Editar producto' }} />
        <Stack.Screen name="AuditDetail" component={AuditDetailScreen} options={{ title: 'Detalle de auditoría' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function ThemedStatusBar() {
  const { mode } = useTheme();
  return <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LocationProvider>
          <RootNavigator />
          <ThemedStatusBar />
        </LocationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
