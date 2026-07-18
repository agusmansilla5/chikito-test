import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';

const nidoLogo = require('../../assets/nido-logo.png');

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    const message = await signIn(email.trim(), password);
    setSubmitting(false);
    if (message) setError(message);
  }

  return (
    <View style={styles.container}>
      <Image source={nidoLogo} style={styles.watermark} resizeMode="contain" />

      <View style={styles.card}>
        <Image source={nidoLogo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.subtitle}>Control de Stock y Auditoría</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#71717a"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#71717a"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Ingresar</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#000' },
  watermark: {
    position: 'absolute',
    top: '50%',
    left: '-30%',
    width: '160%',
    height: 300,
    marginTop: -150,
    opacity: 0.07,
  },
  card: { zIndex: 1 },
  logo: { width: '100%', height: 70, marginBottom: 4 },
  subtitle: { textAlign: 'center', color: '#a1a1aa', fontWeight: '600', marginBottom: 32 },
  input: {
    borderWidth: 1,
    borderColor: '#3f3f46',
    backgroundColor: '#18181b',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: '#dc2626', marginBottom: 12, textAlign: 'center' },
});
