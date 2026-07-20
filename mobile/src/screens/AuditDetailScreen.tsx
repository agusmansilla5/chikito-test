import { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors, ThemeCard } from '../theme';
import { shareCsv, sharePdf } from '../lib/export';
import { formatDateTime } from '../lib/date';
import type { Audit, StockMovement } from '../types';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AuditDetail'>;

type StockRow = { quantity: number; min_stock: number };

export default function AuditDetailScreen({ route }: Props) {
  const { auditId } = route.params;
  const { profile } = useAuth();
  const { colors, card } = useTheme();
  const styles = useMemo(() => createStyles(colors, card), [colors, card]);
  const [audit, setAudit] = useState<Audit | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [stockByProduct, setStockByProduct] = useState<Map<string, StockRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const canClose = profile?.role === 'admin' || profile?.role === 'auditor';

  const load = useCallback(async () => {
    const { data: auditData } = await supabase
      .from('audits')
      .select('*, profiles(full_name)')
      .eq('id', auditId)
      .single();
    setAudit(auditData as Audit);
    setNoteDraft((auditData as Audit)?.note ?? '');

    const { data: movementsData } = await supabase
      .from('stock_movements')
      .select('*, products(name), profiles(full_name)')
      .eq('audit_id', auditId)
      .order('created_at', { ascending: false });
    const movementList = (movementsData as StockMovement[]) ?? [];
    setMovements(movementList);

    const productIds = Array.from(new Set(movementList.map((m) => m.product_id)));
    if (auditData && productIds.length > 0) {
      const { data: stockRows } = await supabase
        .from('product_stock')
        .select('product_id, quantity, min_stock')
        .eq('location_id', (auditData as Audit).location_id)
        .in('product_id', productIds);
      setStockByProduct(new Map((stockRows ?? []).map((r) => [r.product_id, r])));
    } else {
      setStockByProduct(new Map());
    }
    setLoading(false);
  }, [auditId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const summary = useMemo(() => {
    const map = new Map<
      string,
      { name: string; entradas: number; salidas: number; stockFinal: number; minStock: number }
    >();
    for (const m of movements) {
      if (!map.has(m.product_id)) {
        const stock = stockByProduct.get(m.product_id);
        map.set(m.product_id, {
          name: m.products?.name ?? 'Producto',
          entradas: 0,
          salidas: 0,
          stockFinal: stock?.quantity ?? 0,
          minStock: stock?.min_stock ?? 0,
        });
      }
      const row = map.get(m.product_id)!;
      if (m.type === 'entrada') row.entradas += m.quantity;
      else row.salidas += m.quantity;
    }
    return Array.from(map.values())
      .map((s) => ({
        ...s,
        stockInicial: s.stockFinal - s.entradas + s.salidas,
        faltaPedir: Math.max(0, s.minStock - s.stockFinal),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [movements, stockByProduct]);

  async function handleClose() {
    Alert.alert('Cerrar auditoría', '¿Confirmás que terminaste de cargar el conteo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar auditoría',
        onPress: async () => {
          setClosing(true);
          const { error } = await supabase
            .from('audits')
            .update({ ended_at: new Date().toISOString() })
            .eq('id', auditId);
          setClosing(false);
          if (error) {
            Alert.alert('Error', error.message);
            return;
          }
          load();
        },
      },
    ]);
  }

  async function handleSaveNote() {
    setSavingNote(true);
    const { error } = await supabase
      .from('audits')
      .update({ note: noteDraft.trim() || null })
      .eq('id', auditId);
    setSavingNote(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setEditingNote(false);
    load();
  }

  async function handleExport(format: 'csv' | 'pdf') {
    if (!audit) return;
    setExporting(format);
    const headers = ['Producto', 'Stock inicial', 'Entradas', 'Salidas', 'Stock final', 'Mínimo', 'Falta pedir'];
    const rows = summary.map((s) => [
      s.name,
      s.stockInicial,
      s.entradas,
      s.salidas,
      s.stockFinal,
      s.minStock,
      s.faltaPedir,
    ]);
    const dateStr = new Date(audit.started_at).toISOString().slice(0, 10);
    try {
      if (format === 'csv') {
        await shareCsv(`auditoria-${dateStr}.csv`, headers, rows);
      } else {
        await sharePdf(`auditoria-${dateStr}.pdf`, `Auditoría del ${dateStr}`, headers, rows);
      }
    } finally {
      setExporting(null);
    }
  }

  if (loading || !audit) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const isOpen = !audit.ended_at;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      data={summary}
      keyExtractor={(item) => item.name}
      ListHeaderComponent={
        <View>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Inicio</Text>
              <Text style={styles.infoValue}>{formatDateTime(audit.started_at)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cierre</Text>
              <Text style={styles.infoValue}>
                {audit.ended_at ? formatDateTime(audit.ended_at) : 'Todavía en curso'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Responsable</Text>
              <Text style={styles.infoValue}>{audit.profiles?.full_name ?? '—'}</Text>
            </View>

            <Text style={[styles.infoLabel, { marginTop: 8 }]}>Nota</Text>
            {editingNote ? (
              <View>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Nota sobre esta auditoría..."
                  value={noteDraft}
                  onChangeText={setNoteDraft}
                  multiline
                />
                <View style={styles.noteActions}>
                  <Pressable
                    onPress={() => {
                      setNoteDraft(audit.note ?? '');
                      setEditingNote(false);
                    }}
                  >
                    <Text style={styles.noteCancel}>Cancelar</Text>
                  </Pressable>
                  <Pressable style={styles.noteSaveButton} onPress={handleSaveNote} disabled={savingNote}>
                    {savingNote ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.noteSaveText}>Guardar nota</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable onPress={() => canClose && setEditingNote(true)}>
                <Text style={styles.noteText}>{audit.note ? audit.note : canClose ? '+ Agregar nota' : '—'}</Text>
              </Pressable>
            )}
          </View>

          {isOpen && canClose && (
            <Pressable style={styles.closeButton} onPress={handleClose} disabled={closing}>
              {closing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.closeButtonText}>Cerrar auditoría</Text>
              )}
            </Pressable>
          )}

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Productos cargados ({summary.length})</Text>
            <View style={styles.exportRow}>
              <Pressable style={styles.exportButton} onPress={() => handleExport('csv')} disabled={!!exporting}>
                {exporting === 'csv' ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.exportButtonText}>Excel</Text>
                )}
              </Pressable>
              <Pressable style={styles.exportButton} onPress={() => handleExport('pdf')} disabled={!!exporting}>
                {exporting === 'pdf' ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.exportButtonText}>PDF</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>Todavía no se cargó ningún producto en esta auditoría.</Text>}
      renderItem={({ item }) => (
        <View style={styles.productRow}>
          <View style={styles.productHeaderRow}>
            <Text style={styles.productName}>{item.name}</Text>
            <View style={styles.productQtyRow}>
              {item.entradas > 0 && <Text style={styles.qtyIn}>+{item.entradas}</Text>}
              {item.salidas > 0 && <Text style={styles.qtyOut}>-{item.salidas}</Text>}
            </View>
          </View>
          <View style={styles.stockLine}>
            <Text style={styles.stockLineText}>
              Stock: {item.stockInicial} → <Text style={{ fontWeight: '700' }}>{item.stockFinal}</Text>
              {'   '}Mínimo: {item.minStock}
            </Text>
            {item.faltaPedir > 0 && <Text style={styles.faltaPedirText}>Falta pedir: {item.faltaPedir}</Text>}
          </View>
        </View>
      )}
    />
  );
}

function createStyles(colors: ThemeColors, card: ThemeCard) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
    infoCard: { ...card, padding: 14, marginBottom: 12 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    infoLabel: { color: colors.textMuted, fontSize: 13 },
    infoValue: { color: colors.text, fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
    noteText: { color: colors.primary, fontSize: 13, marginTop: 4 },
    noteInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
      marginTop: 4,
      backgroundColor: colors.background,
      color: colors.text,
      minHeight: 60,
      textAlignVertical: 'top',
    },
    noteActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
    noteCancel: { color: colors.textMuted, fontWeight: '600', paddingVertical: 8 },
    noteSaveButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 14,
    },
    noteSaveText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    closeButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 14,
      alignItems: 'center',
      marginBottom: 20,
    },
    closeButtonText: { color: '#fff', fontWeight: '600' },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
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
    productRow: {
      ...card,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 8,
    },
    productHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    productName: { fontWeight: '600', color: colors.text, flex: 1 },
    productQtyRow: { flexDirection: 'row', gap: 10 },
    stockLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
    stockLineText: { fontSize: 12, color: colors.textMuted },
    faltaPedirText: { fontSize: 12, color: colors.red, fontWeight: '700' },
    qtyIn: { color: colors.green, fontWeight: '700' },
    qtyOut: { color: colors.red, fontWeight: '700' },
    empty: { textAlign: 'center', marginTop: 24, color: colors.textMuted },
  });
}
