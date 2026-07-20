import { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors, ThemeCard } from '../theme';
import { StatCard } from '../components/StatCard';
import { MovementsChart } from '../components/MovementsChart';
import { shareCsv, sharePdf } from '../lib/export';
import type { StockMovement, Product } from '../types';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Reports'>;

export default function ReportsScreen({ navigation }: Props) {
  const { colors, card } = useTheme();
  const styles = useMemo(() => createStyles(colors, card), [colors, card]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [weekMovements, setWeekMovements] = useState<{ type: string; quantity: number; created_at: string }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [{ data: movementsData }, { data: lowStockData }, { data: productsData }, { data: weekData }] =
      await Promise.all([
        supabase
          .from('stock_movements')
          .select('*, products(name), profiles(full_name)')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('low_stock_products').select('*'),
        supabase.from('products').select('*, categories(name)').eq('active', true).order('name'),
        supabase
          .from('stock_movements')
          .select('type, quantity, created_at')
          .gte('created_at', sevenDaysAgo.toISOString()),
      ]);
    setMovements((movementsData as StockMovement[]) ?? []);
    setLowStock((lowStockData as Product[]) ?? []);
    setAllProducts((productsData as Product[]) ?? []);
    setWeekMovements(weekData ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const todayKey = new Date().toDateString();
  const movementsToday = movements.filter((m) => new Date(m.created_at).toDateString() === todayKey).length;

  const stockValue = allProducts.reduce((sum, p) => sum + p.quantity * (p.cost_price ?? 0), 0);
  const stockValueLabel = stockValue.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

  const chartData = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }).map((_, i) => {
      const day = new Date(sevenDaysAgo);
      day.setDate(day.getDate() + i);
      const dayKey = day.toDateString();
      const dayMovements = weekMovements.filter((m) => new Date(m.created_at).toDateString() === dayKey);
      return {
        label: day.toLocaleDateString('es-AR', { weekday: 'short' }),
        entradas: dayMovements.filter((m) => m.type === 'entrada').reduce((s, m) => s + m.quantity, 0),
        salidas: dayMovements.filter((m) => m.type === 'salida').reduce((s, m) => s + m.quantity, 0),
      };
    });
  }, [weekMovements]);

  async function handleExportMovements(format: 'csv' | 'pdf') {
    setExporting(`movements-${format}`);
    const headers = ['Producto', 'Tipo', 'Cantidad', 'Usuario', 'Fecha'];
    const rows = movements.map((m) => [
      m.products?.name ?? '—',
      m.type === 'entrada' ? 'Entrada' : 'Salida',
      m.quantity,
      m.profiles?.full_name ?? '—',
      new Date(m.created_at).toLocaleString('es-AR'),
    ]);
    try {
      if (format === 'csv') {
        await shareCsv('movimientos.csv', headers, rows);
      } else {
        await sharePdf('movimientos.pdf', 'Reporte de movimientos de stock', headers, rows);
      }
    } finally {
      setExporting(null);
    }
  }

  async function handleExportStock(format: 'csv' | 'pdf') {
    setExporting(`stock-${format}`);
    const headers = ['Producto', 'Rubro', 'Stock', 'Mínimo', 'Falta pedir'];
    const rows = allProducts.map((p) => [
      p.name,
      p.categories?.name ?? 'Sin rubro',
      p.quantity,
      p.min_stock,
      Math.max(0, p.min_stock - p.quantity),
    ]);
    try {
      if (format === 'csv') {
        await shareCsv('stock-actual.csv', headers, rows);
      } else {
        await sharePdf('stock-actual.pdf', 'Informe de stock actual', headers, rows);
      }
    } finally {
      setExporting(null);
    }
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 40, paddingHorizontal: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      ListHeaderComponent={
        <View>
          <View style={styles.navRow}>
            <Pressable style={styles.navButton} onPress={() => navigation.navigate('Audits')}>
              <Text style={styles.navButtonText}>📋 Auditorías</Text>
            </Pressable>
            <Pressable style={styles.navButton} onPress={() => navigation.navigate('ProductList')}>
              <Text style={styles.navButtonText}>📦 Productos</Text>
            </Pressable>
            <Pressable style={styles.navButton} onPress={() => navigation.navigate('Settings')}>
              <Text style={styles.navButtonText}>⚙️ Config.</Text>
            </Pressable>
          </View>

          <View style={styles.statsRow}>
            <StatCard label="Movimientos de hoy" value={movementsToday} />
            <StatCard label="Stock bajo" value={lowStock.length} />
            <StatCard label="Productos" value={allProducts.length} />
          </View>
          <View style={{ marginBottom: 16 }}>
            <StatCard label="Valor de stock" value={stockValueLabel} />
          </View>

          <View style={{ marginBottom: 16 }}>
            <MovementsChart data={chartData} />
          </View>

          {lowStock.length > 0 && (
            <View style={styles.alertBox}>
              <Text style={styles.alertTitle}>⚠ Stock bajo</Text>
              {lowStock.map((p) => (
                <Text key={p.id} style={styles.alertItem}>
                  {p.name}: {p.quantity} (mínimo {p.min_stock})
                </Text>
              ))}
            </View>
          )}

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Stock actual</Text>
            <ExportButtons
              exporting={exporting}
              prefix="stock"
              onCsv={() => handleExportStock('csv')}
              onPdf={() => handleExportStock('pdf')}
            />
          </View>
          <View style={styles.stockTable}>
            {allProducts.length === 0 && <Text style={styles.empty}>No hay productos cargados todavía.</Text>}
            {allProducts.map((p) => {
              const missing = Math.max(0, p.min_stock - p.quantity);
              return (
                <View key={p.id} style={styles.stockRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName}>{p.name}</Text>
                    <Text style={styles.meta}>{p.categories?.name ?? 'Sin rubro'}</Text>
                  </View>
                  <Text style={[styles.qtyIn, missing > 0 && styles.qtyOut]}>{p.quantity}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Últimos movimientos</Text>
            <ExportButtons
              exporting={exporting}
              prefix="movements"
              onCsv={() => handleExportMovements('csv')}
              onPdf={() => handleExportMovements('pdf')}
            />
          </View>
        </View>
      }
      data={movements}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={<Text style={styles.empty}>Todavía no hay movimientos registrados.</Text>}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName}>{item.products?.name ?? 'Producto'}</Text>
            <Text style={styles.meta}>
              {item.profiles?.full_name ?? ''} · {new Date(item.created_at).toLocaleString()}
            </Text>
            {item.note && <Text style={styles.note}>{item.note}</Text>}
          </View>
          <Text style={item.type === 'entrada' ? styles.qtyIn : styles.qtyOut}>
            {item.type === 'entrada' ? '+' : '-'}
            {item.quantity}
          </Text>
        </View>
      )}
    />
  );
}

function ExportButtons({
  prefix,
  exporting,
  onCsv,
  onPdf,
}: {
  prefix: string;
  exporting: string | null;
  onCsv: () => void;
  onPdf: () => void;
}) {
  const { colors, card } = useTheme();
  const styles = useMemo(() => createStyles(colors, card), [colors, card]);
  return (
    <View style={styles.exportRow}>
      <Pressable style={styles.exportButton} onPress={onCsv} disabled={!!exporting}>
        {exporting === `${prefix}-csv` ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={styles.exportButtonText}>Excel</Text>
        )}
      </Pressable>
      <Pressable style={styles.exportButton} onPress={onPdf} disabled={!!exporting}>
        {exporting === `${prefix}-pdf` ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={styles.exportButtonText}>PDF</Text>
        )}
      </Pressable>
    </View>
  );
}

function createStyles(colors: ThemeColors, card: ThemeCard) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    title: { fontSize: 22, fontWeight: '700', marginBottom: 16, color: colors.text },
    navRow: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 16 },
    navButton: { ...card, flex: 1, paddingVertical: 12, alignItems: 'center' },
    navButtonText: { fontWeight: '600', color: colors.text },
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
      marginBottom: 8,
    },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
    exportRow: { flexDirection: 'row', gap: 8 },
    exportButton: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 12,
      minWidth: 56,
      alignItems: 'center',
    },
    exportButtonText: { color: colors.primary, fontWeight: '600', fontSize: 12 },
    alertBox: {
      backgroundColor: '#fef2f2',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#fecaca',
      padding: 12,
      marginBottom: 16,
    },
    alertTitle: { fontWeight: '700', color: '#b91c1c', marginBottom: 4 },
    alertItem: { color: '#b91c1c' },
    stockTable: { ...card, marginBottom: 16, paddingHorizontal: 14 },
    stockRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    row: {
      ...card,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 8,
    },
    productName: { fontWeight: '600', color: colors.text },
    meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    note: { fontSize: 12, color: '#555', marginTop: 2, fontStyle: 'italic' },
    qtyIn: { color: colors.green, fontWeight: '700', fontSize: 16 },
    qtyOut: { color: colors.red, fontWeight: '700', fontSize: 16 },
    empty: { textAlign: 'center', marginTop: 24, color: colors.textMuted },
  });
}
