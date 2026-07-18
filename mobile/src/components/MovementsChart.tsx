import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors, ThemeCard } from '../theme';

type DayData = { label: string; entradas: number; salidas: number };

export function MovementsChart({ data }: { data: DayData[] }) {
  const { colors, card } = useTheme();
  const styles = useMemo(() => createStyles(colors, card), [colors, card]);
  const maxVal = Math.max(1, ...data.flatMap((d) => [d.entradas, d.salidas]));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Movimientos — últimos 7 días</Text>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors.green }]} />
            <Text style={styles.legendText}>Entradas</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors.red }]} />
            <Text style={styles.legendText}>Salidas</Text>
          </View>
        </View>
      </View>

      <View style={styles.chartArea}>
        {data.map((d) => (
          <View key={d.label} style={styles.dayColumn}>
            <View style={styles.bars}>
              <View
                style={[
                  styles.bar,
                  { height: Math.max(2, (d.entradas / maxVal) * 100), backgroundColor: colors.green },
                ]}
              />
              <View
                style={[
                  styles.bar,
                  { height: Math.max(2, (d.salidas / maxVal) * 100), backgroundColor: colors.red },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
      <View style={styles.labelsRow}>
        {data.map((d) => (
          <Text key={d.label} style={styles.dayLabel}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors, card: ThemeCard) {
  return StyleSheet.create({
    card: { ...card, padding: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    title: { fontSize: 13, fontWeight: '700', color: colors.text },
    legend: { flexDirection: 'row', gap: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 11, color: colors.textMuted },
    chartArea: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      height: 110,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dayColumn: { flex: 1, alignItems: 'center' },
    bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 100 },
    bar: { width: 10, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
    labelsRow: { flexDirection: 'row', marginTop: 6 },
    dayLabel: { flex: 1, textAlign: 'center', fontSize: 10, color: colors.textMuted, textTransform: 'capitalize' },
  });
}
