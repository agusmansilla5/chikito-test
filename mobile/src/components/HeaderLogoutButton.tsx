import { Pressable, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export function HeaderLogoutButton() {
  const { signOut } = useAuth();
  const { colors } = useTheme();
  return (
    <Pressable onPress={signOut} hitSlop={8}>
      <Text style={{ color: colors.red, fontWeight: '600' }}>Salir</Text>
    </Pressable>
  );
}
