import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors, ThemeCard } from '../theme';

export function StatCard({ label, value }: { label: string; value: string | number }) {
  const { colors, card } = useTheme();
  const styles = useMemo(() => createStyles(colors, card), [colors, card]);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors, card: ThemeCard) {
  return StyleSheet.create({
    card: { ...card, flex: 1, padding: 14 },
    label: { fontSize: 12, color: colors.textMuted },
    value: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 4 },
  });
}
