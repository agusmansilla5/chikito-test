import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { isValidHex, PRESET_COLORS, DEFAULT_PRIMARY } from '../theme';
import type { ThemeColors, ThemeCard } from '../theme';

export default function SettingsScreen() {
  const { mode, setMode, primaryColor, setPrimaryColor, resetPrimaryColor, colors, card } = useTheme();
  const styles = useMemo(() => createStyles(colors, card), [colors, card]);
  const [hexInput, setHexInput] = useState(primaryColor);
  const [hexError, setHexError] = useState<string | null>(null);

  function applyHex() {
    const trimmed = hexInput.trim();
    const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    if (!isValidHex(withHash)) {
      setHexError('Formato inválido. Usá 6 dígitos, ej: #2563EB');
      return;
    }
    setHexError(null);
    setPrimaryColor(withHash);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.title}>Configuración</Text>

      <Text style={styles.sectionTitle}>Personalización</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Tema</Text>
        <View style={styles.modeRow}>
          <Pressable
            style={[styles.modeButton, mode === 'light' && styles.modeButtonActive]}
            onPress={() => setMode('light')}
          >
            <Text style={[styles.modeButtonText, mode === 'light' && styles.modeButtonTextActive]}>☀️ Claro</Text>
          </Pressable>
          <Pressable
            style={[styles.modeButton, mode === 'dark' && styles.modeButtonActive]}
            onPress={() => setMode('dark')}
          >
            <Text style={[styles.modeButtonText, mode === 'dark' && styles.modeButtonTextActive]}>🌙 Oscuro</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Color principal (botones, links)</Text>
        <View style={styles.swatchRow}>
          {PRESET_COLORS.map((c) => (
            <Pressable
              key={c}
              style={[
                styles.swatch,
                { backgroundColor: c },
                primaryColor.toLowerCase() === c.toLowerCase() && styles.swatchSelected,
              ]}
              onPress={() => {
                setPrimaryColor(c);
                setHexInput(c);
                setHexError(null);
              }}
            />
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 16 }]}>Color personalizado (HEX)</Text>
        <View style={styles.hexRow}>
          <View style={[styles.hexPreview, { backgroundColor: isValidHex(hexInput) ? hexInput : colors.border }]} />
          <TextInput
            style={styles.hexInput}
            placeholder="#2563EB"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            value={hexInput}
            onChangeText={setHexInput}
            maxLength={7}
          />
          <Pressable style={styles.applyButton} onPress={applyHex}>
            <Text style={styles.applyButtonText}>Aplicar</Text>
          </Pressable>
        </View>
        {hexError && <Text style={styles.hexError}>{hexError}</Text>}

        <Pressable
          style={styles.resetLink}
          onPress={() => {
            resetPrimaryColor();
            setHexInput(DEFAULT_PRIMARY);
            setHexError(null);
          }}
        >
          <Text style={styles.resetLinkText}>Restablecer color por defecto</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors, card: ThemeCard) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    title: { fontSize: 22, fontWeight: '700', marginBottom: 16, color: colors.text },
    sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: colors.text },
    card: { ...card, padding: 16, marginBottom: 16 },
    label: { fontWeight: '600', color: colors.text, marginBottom: 10 },
    modeRow: { flexDirection: 'row', gap: 10 },
    modeButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
    },
    modeButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    modeButtonText: { fontWeight: '600', color: colors.text },
    modeButtonTextActive: { color: '#fff' },
    swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    swatch: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    swatchSelected: { borderColor: colors.text },
    hexRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    hexPreview: { width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
    hexInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      color: colors.text,
    },
    applyButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    applyButtonText: { color: '#fff', fontWeight: '600' },
    hexError: { color: colors.red, fontSize: 12, marginTop: 8 },
    resetLink: { marginTop: 14, alignSelf: 'flex-start' },
    resetLinkText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  });
}
