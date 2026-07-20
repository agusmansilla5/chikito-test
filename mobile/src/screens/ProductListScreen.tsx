import { useCallback, useMemo, useState } from 'react';
import { View, Text, SectionList, StyleSheet, Pressable, RefreshControl, Alert, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors, ThemeCard } from '../theme';
import type { Product } from '../types';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductList'>;
type SortKey = 'name' | 'category' | 'quantity';

const SIN_RUBRO = 'Sin rubro';

function compareProducts(a: Product, b: Product, key: SortKey, dir: 'asc' | 'desc') {
  let cmp = 0;
  if (key === 'name') cmp = a.name.localeCompare(b.name);
  else if (key === 'quantity') cmp = a.quantity - b.quantity;
  else cmp = (a.categories?.name ?? SIN_RUBRO).localeCompare(b.categories?.name ?? SIN_RUBRO);
  return dir === 'asc' ? cmp : -cmp;
}

export default function ProductListScreen({ navigation }: Props) {
  const { profile } = useAuth();
  const { colors, card } = useTheme();
  const styles = useMemo(() => createStyles(colors, card), [colors, card]);
  const [products, setProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const canRegisterMovements = profile?.role === 'admin' || profile?.role === 'auditor';
  const canDelete = profile?.role === 'admin';

  const loadProducts = useCallback(async () => {
    const { data } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('active', true)
      .order('name');
    setProducts((data as Product[]) ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  }

  function handleDelete(product: Product) {
    Alert.alert('Eliminar producto', `¿Seguro que querés eliminar "${product.name}"? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('products').update({ active: false }).eq('id', product.id);
          if (error) {
            Alert.alert('Error', error.message);
            return;
          }
          setProducts((prev) => prev.filter((p) => p.id !== product.id));
        },
      },
    ]);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(term) || (p.barcode ?? '').toLowerCase().includes(term)
    );
  }, [products, search]);

  const sections = useMemo(() => {
    const itemSortKey: SortKey = sortKey === 'category' ? 'name' : sortKey;
    const sorted = [...filtered].sort((a, b) =>
      compareProducts(a, b, itemSortKey, sortKey === 'category' ? 'asc' : sortDir)
    );
    const groups = new Map<string, Product[]>();
    for (const product of sorted) {
      const key = product.categories?.name ?? SIN_RUBRO;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(product);
    }
    const entries = Array.from(groups.entries());
    if (sortKey === 'category') {
      entries.sort(([a], [b]) => (sortDir === 'asc' ? a.localeCompare(b) : b.localeCompare(a)));
    } else {
      entries.sort(([a], [b]) => (a === SIN_RUBRO ? 1 : b === SIN_RUBRO ? -1 : a.localeCompare(b)));
    }
    return entries.map(([title, data]) => ({ title, data }));
  }, [filtered, sortKey, sortDir]);

  function sortArrow(key: SortKey) {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o código..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Ordenar:</Text>
          {(['name', 'category', 'quantity'] as SortKey[]).map((key) => (
            <Pressable
              key={key}
              style={[styles.sortChip, sortKey === key && styles.sortChipActive]}
              onPress={() => toggleSort(key)}
            >
              <Text style={[styles.sortChipText, sortKey === key && styles.sortChipTextActive]}>
                {key === 'name' ? 'Nombre' : key === 'category' ? 'Categoría' : 'Stock'}
                {sortArrow(key)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>No se encontraron productos.</Text>}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
              onPress={() => canRegisterMovements && navigation.navigate('AddProduct', { productId: item.id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                {item.barcode && <Text style={styles.barcode}>{item.barcode}</Text>}
              </View>
              <Text style={[styles.qty, item.quantity < item.min_stock && styles.qtyLow]}>
                {item.quantity}
              </Text>
            </Pressable>
            {canDelete && (
              <Pressable style={styles.deleteIcon} onPress={() => handleDelete(item)}>
                <Text style={styles.deleteIconText}>🗑</Text>
              </Pressable>
            )}
          </View>
        )}
      />

      {canRegisterMovements && (
        <Pressable style={styles.fab} onPress={() => navigation.navigate('AddMovement')}>
          <Text style={styles.fabText}>+ Movimiento</Text>
        </Pressable>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors, card: ThemeCard) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    filterBar: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 4,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.background,
      color: colors.text,
      marginBottom: 8,
    },
    sortRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
    sortLabel: { fontSize: 12, color: colors.textMuted, marginRight: 2 },
    sortChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    sortChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    sortChipText: { fontSize: 12, color: colors.text, fontWeight: '600' },
    sortChipTextActive: { color: '#fff' },
    sectionHeader: {
      paddingTop: 12,
      paddingBottom: 6,
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
    },
    row: {
      ...card,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 8,
    },
    name: { fontSize: 16, fontWeight: '500', color: colors.text },
    barcode: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    qty: { fontSize: 18, fontWeight: '700', color: colors.green, marginRight: 8 },
    qtyLow: { color: colors.red },
    deleteIcon: { paddingHorizontal: 8, paddingVertical: 4 },
    deleteIconText: { fontSize: 18 },
    empty: { textAlign: 'center', marginTop: 40, color: colors.textMuted },
    fab: {
      position: 'absolute',
      right: 16,
      bottom: 40,
      backgroundColor: colors.primary,
      borderRadius: 24,
      paddingVertical: 12,
      paddingHorizontal: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    fabText: { color: '#fff', fontWeight: '600' },
  });
}
