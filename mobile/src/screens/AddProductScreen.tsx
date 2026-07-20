import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLocation } from '../context/LocationContext';
import type { ThemeColors } from '../theme';
import { BARCODE_TYPES } from '../constants';
import type { Category } from '../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddProduct'>;

export default function AddProductScreen({ navigation, route }: Props) {
  const { profile } = useAuth();
  const { colors } = useTheme();
  const { realLocationId } = useLocation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const productId = route.params?.productId ?? null;

  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [minStock, setMinStock] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scanLock = useRef(false);

  useEffect(() => {
    navigation.setOptions({ title: 'Editar producto' });
  }, [navigation]);

  useEffect(() => {
    loadCategories();
    if (!productId || !realLocationId) {
      setLoading(false);
      return;
    }
    Promise.all([
      supabase.from('products').select('*').eq('id', productId).single(),
      supabase
        .from('product_stock')
        .select('min_stock')
        .eq('product_id', productId)
        .eq('location_id', realLocationId)
        .maybeSingle(),
    ]).then(([{ data }, { data: stock }]) => {
      if (data) {
        setName(data.name);
        setBarcode(data.barcode ?? '');
        setMinStock(String(stock?.min_stock ?? 0));
        setCostPrice(data.cost_price != null ? String(data.cost_price) : '');
        setSalePrice(data.sale_price != null ? String(data.sale_price) : '');
        setCategoryId(data.category_id);
      }
      setLoading(false);
    });
  }, [productId, realLocationId]);

  async function loadCategories() {
    const { data } = await supabase.from('categories').select('*').order('name');
    setCategories((data as Category[]) ?? []);
  }

  async function handleCreateCategory() {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const { data, error: insertError } = await supabase
      .from('categories')
      .insert({ name: trimmed })
      .select()
      .single();
    if (insertError) {
      setError(insertError.code === '23505' ? 'Ya existe esa categoría.' : insertError.message);
      return;
    }
    setCategories((prev) => [...prev, data as Category].sort((a, b) => a.name.localeCompare(b.name)));
    setCategoryId((data as Category).id);
    setNewCategoryName('');
  }

  async function handleOpenScanner() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setError('Necesitamos permiso de cámara para escanear.');
        return;
      }
    }
    scanLock.current = false;
    setScannerVisible(true);
  }

  function handleBarcodeScanned({ data }: BarcodeScanningResult) {
    if (scanLock.current) return;
    scanLock.current = true;
    setScannerVisible(false);
    setBarcode(data);
  }

  async function handleSubmit() {
    if (!productId) return;
    setError(null);
    if (!name.trim()) {
      setError('Ingresá un nombre para el producto.');
      return;
    }

    setSubmitting(true);
    const { error: dbError } = await supabase
      .from('products')
      .update({
        name: name.trim(),
        barcode: barcode.trim() || null,
        cost_price: costPrice.trim() ? Number(costPrice) : null,
        sale_price: salePrice.trim() ? Number(salePrice) : null,
        category_id: categoryId,
      })
      .eq('id', productId);

    if (!dbError && realLocationId) {
      await supabase
        .from('product_stock')
        .upsert(
          { product_id: productId, location_id: realLocationId, min_stock: Number(minStock) || 0 },
          { onConflict: 'product_id,location_id' }
        );
    }
    setSubmitting(false);

    if (dbError) {
      if (dbError.code === '23505') {
        setError(
          dbError.message.includes('products_name_lower_idx')
            ? 'Ya existe otro producto con ese nombre.'
            : 'Ya existe un producto con ese código de barras.'
        );
      } else {
        setError(dbError.message);
      }
      return;
    }
    navigation.goBack();
  }

  function handleDelete() {
    if (!productId) return;
    Alert.alert('Eliminar producto', `¿Seguro que querés eliminar "${name}"? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setSubmitting(true);
          const { error: deleteError } = await supabase
            .from('products')
            .update({ active: false })
            .eq('id', productId);
          setSubmitting(false);
          if (deleteError) {
            setError(deleteError.message);
            return;
          }
          navigation.goBack();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.label}>Nombre</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej: Gatorade 500ml"
        placeholderTextColor={colors.textMuted}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Código de barras (opcional)</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Dejalo vacío si no tiene"
          placeholderTextColor={colors.textMuted}
          value={barcode}
          onChangeText={setBarcode}
        />
        <Pressable style={styles.scanButton} onPress={handleOpenScanner}>
          <Text style={styles.scanButtonText}>📷 Escanear</Text>
        </Pressable>
      </View>

      <Modal visible={scannerVisible} animationType="slide">
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame} />
            <Text style={styles.scannerHint}>Apuntá al código de barras del producto</Text>
          </View>
          <Pressable style={styles.scannerCloseButton} onPress={() => setScannerVisible(false)}>
            <Text style={styles.scannerCloseText}>Cancelar</Text>
          </Pressable>
        </View>
      </Modal>

      <Text style={styles.label}>Stock mínimo (para alertas)</Text>
      <TextInput
        style={styles.input}
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        keyboardType="numeric"
        value={minStock}
        onChangeText={setMinStock}
      />

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Costo (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={costPrice}
            onChangeText={setCostPrice}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Precio de venta (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={salePrice}
            onChangeText={setSalePrice}
          />
        </View>
      </View>

      <Text style={styles.label}>Rubro / categoría (opcional)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        <Pressable
          style={[styles.chip, categoryId === null && styles.chipSelected]}
          onPress={() => setCategoryId(null)}
        >
          <Text style={categoryId === null ? styles.chipTextSelected : styles.chipText}>Sin rubro</Text>
        </Pressable>
        {categories.map((c) => (
          <Pressable
            key={c.id}
            style={[styles.chip, categoryId === c.id && styles.chipSelected]}
            onPress={() => setCategoryId(c.id)}
          >
            <Text style={categoryId === c.id ? styles.chipTextSelected : styles.chipText}>{c.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Nuevo rubro (ej: Con alcohol)"
          placeholderTextColor={colors.textMuted}
          value={newCategoryName}
          onChangeText={setNewCategoryName}
        />
        <Pressable style={styles.scanButton} onPress={handleCreateCategory}>
          <Text style={styles.scanButtonText}>+ Crear</Text>
        </Pressable>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Guardar cambios</Text>}
      </Pressable>

      {profile?.role === 'admin' && (
        <Pressable style={styles.deleteButton} onPress={handleDelete} disabled={submitting}>
          <Text style={styles.deleteButtonText}>Eliminar producto</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
    label: { fontWeight: '600', marginBottom: 6, marginTop: 12, color: colors.text },
    row: { flexDirection: 'row', gap: 8 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      backgroundColor: colors.surface,
      color: colors.text,
    },
    scanButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 16,
      justifyContent: 'center',
    },
    scanButtonText: { color: '#fff', fontWeight: '600' },
    scannerContainer: { flex: 1, backgroundColor: '#000' },
    scannerOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scannerFrame: {
      width: '75%',
      height: 140,
      borderWidth: 2,
      borderColor: '#fff',
      borderRadius: 12,
    },
    scannerHint: { color: '#fff', marginTop: 16, fontSize: 14 },
    scannerCloseButton: {
      position: 'absolute',
      bottom: 48,
      alignSelf: 'center',
      backgroundColor: 'rgba(255,255,255,0.9)',
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    scannerCloseText: { color: '#111', fontWeight: '600' },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 14,
      marginRight: 8,
    },
    chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { color: colors.text },
    chipTextSelected: { color: '#fff', fontWeight: '600' },
    error: { color: colors.red, marginTop: 16 },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 14,
      alignItems: 'center',
      marginTop: 24,
    },
    submitButtonText: { color: '#fff', fontWeight: '600' },
    deleteButton: {
      borderRadius: 8,
      padding: 14,
      alignItems: 'center',
      marginTop: 12,
      marginBottom: 40,
      borderWidth: 1,
      borderColor: colors.red,
    },
    deleteButtonText: { color: colors.red, fontWeight: '600' },
  });
}
