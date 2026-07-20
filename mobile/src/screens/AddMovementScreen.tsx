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
} from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors, ThemeCard } from '../theme';
import { BARCODE_TYPES } from '../constants';
import { findSimilarProducts } from '../lib/matching';
import type { Product, Category, MovementType, Audit } from '../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddMovement'>;

const SIN_RUBRO = 'Sin rubro';
const looksLikeBarcode = (text: string) => /^\d{6,}$/.test(text.trim());

export default function AddMovementScreen({ navigation }: Props) {
  const { session } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [type, setType] = useState<MovementType>('entrada');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scanLock = useRef(false);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newMinStock, setNewMinStock] = useState('');
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [activeAudit, setActiveAudit] = useState<Audit | null>(null);

  useEffect(() => {
    loadProducts();
    supabase
      .from('categories')
      .select('*')
      .order('name')
      .then(({ data }) => setCategories((data as Category[]) ?? []));
    supabase
      .from('audits')
      .select('*')
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setActiveAudit(data as Audit | null));
  }, []);

  async function loadProducts() {
    const { data } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('active', true)
      .order('name');
    setProducts((data as Product[]) ?? []);
  }

  const similarProducts = useMemo(
    () => (creating ? findSimilarProducts(newName, products) : []),
    [creating, newName, products]
  );

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(term) || (p.barcode ?? '').toLowerCase().includes(term)
    );
  }, [products, query]);

  function selectProduct(p: Product) {
    setSelectedProduct(p);
    setCreating(false);
    setError(null);
  }

  function openCreateForm() {
    const trimmed = query.trim();
    setNewName(looksLikeBarcode(trimmed) ? '' : trimmed);
    setNewBarcode(looksLikeBarcode(trimmed) ? trimmed : '');
    setNewMinStock('');
    setNewCategoryId(null);
    setSelectedProduct(null);
    setCreating(true);
    setError(null);
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
    setQuery(data);
    const match = products.find((p) => p.barcode === data);
    if (match) {
      selectProduct(match);
    } else {
      setNewName('');
      setNewBarcode(data);
      setNewMinStock('');
      setNewCategoryId(null);
      setSelectedProduct(null);
      setCreating(true);
    }
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
    setNewCategoryId((data as Category).id);
    setNewCategoryName('');
  }

  async function handleCreateProduct() {
    setError(null);
    if (!newName.trim()) {
      setError('Ingresá un nombre para el producto nuevo.');
      return;
    }
    setSubmitting(true);
    const { data, error: insertError } = await supabase
      .from('products')
      .insert({
        name: newName.trim(),
        barcode: newBarcode.trim() || null,
        min_stock: Number(newMinStock) || 0,
        category_id: newCategoryId,
      })
      .select('*, categories(name)')
      .single();
    setSubmitting(false);

    if (insertError) {
      if (insertError.code === '23505') {
        setError(
          insertError.message.includes('products_name_lower_idx')
            ? 'Ya existe un producto con ese nombre. Elegilo de la lista de arriba en vez de crear uno nuevo.'
            : 'Ya existe un producto con ese código de barras.'
        );
      } else {
        setError(insertError.message);
      }
      return;
    }
    const created = data as Product;
    setProducts((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setCreating(false);
    setQuery('');
    selectProduct(created);
  }

  async function handleSubmit() {
    setError(null);
    if (!selectedProduct) {
      setError('Elegí un producto.');
      return;
    }
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setError('Ingresá una cantidad válida.');
      return;
    }
    if (!session) return;

    setSubmitting(true);
    const { error: insertError } = await supabase.from('stock_movements').insert({
      product_id: selectedProduct.id,
      type,
      quantity: qty,
      note: note.trim() || null,
      created_by: session.user.id,
      audit_id: activeAudit?.id ?? null,
    });
    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }
    navigation.goBack();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Registrar movimiento</Text>

      {activeAudit && (
        <View style={styles.auditBanner}>
          <Text style={styles.auditBannerText}>
            📋 Auditoría en curso{activeAudit.note ? `: ${activeAudit.note}` : ''} — este movimiento va a quedar
            registrado en ella.
          </Text>
        </View>
      )}

      <Text style={styles.label}>Buscar producto (nombre o código de barras)</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Escribí o escaneá..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setSelectedProduct(null);
            setCreating(false);
          }}
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

      {!creating && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12, marginBottom: 4 }}>
            {filteredProducts.map((p) => (
              <Pressable
                key={p.id}
                style={[styles.chip, selectedProduct?.id === p.id && styles.chipSelected]}
                onPress={() => selectProduct(p)}
              >
                <Text style={selectedProduct?.id === p.id ? styles.chipTextSelected : styles.chipText}>
                  {p.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {filteredProducts.length === 0 && (
            <Text style={styles.hint}>No se encontró ningún producto con "{query}".</Text>
          )}
          <Pressable style={styles.createLink} onPress={openCreateForm}>
            <Text style={styles.createLinkText}>+ Crear producto nuevo</Text>
          </Pressable>
        </>
      )}

      {creating && (
        <View style={styles.createBox}>
          <Text style={styles.createBoxTitle}>Producto nuevo</Text>

          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Gatorade 500ml"
            placeholderTextColor={colors.textMuted}
            value={newName}
            onChangeText={setNewName}
          />

          {similarProducts.length > 0 && (
            <View style={styles.suggestionsBox}>
              <Text style={styles.suggestionsTitle}>¿Ya existe? Tocá para usarlo en vez de crear uno nuevo:</Text>
              {similarProducts.map((p) => (
                <Pressable key={p.id} style={styles.suggestionRow} onPress={() => selectProduct(p)}>
                  <Text style={styles.suggestionName}>{p.name}</Text>
                  <Text style={styles.suggestionStock}>Stock: {p.quantity}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <Text style={styles.label}>Código de barras (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Dejalo vacío si no tiene"
            placeholderTextColor={colors.textMuted}
            value={newBarcode}
            onChangeText={setNewBarcode}
          />

          <Text style={styles.label}>Stock mínimo (para alertas)</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={newMinStock}
            onChangeText={setNewMinStock}
          />

          <Text style={styles.label}>Rubro (opcional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            <Pressable
              style={[styles.chip, newCategoryId === null && styles.chipSelected]}
              onPress={() => setNewCategoryId(null)}
            >
              <Text style={newCategoryId === null ? styles.chipTextSelected : styles.chipText}>{SIN_RUBRO}</Text>
            </Pressable>
            {categories.map((c) => (
              <Pressable
                key={c.id}
                style={[styles.chip, newCategoryId === c.id && styles.chipSelected]}
                onPress={() => setNewCategoryId(c.id)}
              >
                <Text style={newCategoryId === c.id ? styles.chipTextSelected : styles.chipText}>{c.name}</Text>
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

          <View style={styles.row}>
            <Pressable style={styles.cancelButton} onPress={() => setCreating(false)}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable style={[styles.submitButton, { flex: 1, marginTop: 0 }]} onPress={handleCreateProduct} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Crear y usar este producto</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {selectedProduct && !creating && (
        <>
          <Text style={styles.selectedLabel}>Producto seleccionado: {selectedProduct.name}</Text>

          <Text style={styles.label}>Tipo de movimiento</Text>
          <View style={styles.row}>
            <Pressable
              style={[styles.typeButton, type === 'entrada' && styles.typeButtonActiveIn]}
              onPress={() => setType('entrada')}
            >
              <Text style={type === 'entrada' ? styles.typeTextActive : styles.typeText}>Entrada</Text>
            </Pressable>
            <Pressable
              style={[styles.typeButton, type === 'salida' && styles.typeButtonActiveOut]}
              onPress={() => setType('salida')}
            >
              <Text style={type === 'salida' ? styles.typeTextActive : styles.typeText}>Salida</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Cantidad</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={quantity}
            onChangeText={setQuantity}
          />

          <Text style={styles.label}>Nota (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Comentario"
            placeholderTextColor={colors.textMuted}
            value={note}
            onChangeText={setNote}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Guardar</Text>}
          </Pressable>
        </>
      )}

      {error && creating && <Text style={styles.error}>{error}</Text>}
      {error && !selectedProduct && !creating && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    title: { fontSize: 20, fontWeight: '700', marginBottom: 24, color: colors.text },
    auditBanner: {
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 8,
      padding: 10,
      marginBottom: 16,
    },
    auditBannerText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
    label: { fontWeight: '600', marginBottom: 6, marginTop: 12, color: colors.text },
    hint: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
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
    createLink: { marginTop: 8, marginBottom: 8 },
    createLinkText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
    createBox: {
      marginTop: 12,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    createBoxTitle: { fontWeight: '700', fontSize: 14, color: colors.text },
    suggestionsBox: {
      marginTop: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#fde68a',
      backgroundColor: '#fffbeb',
      overflow: 'hidden',
    },
    suggestionsTitle: {
      fontSize: 12,
      color: '#92400e',
      padding: 10,
      paddingBottom: 4,
      fontWeight: '600',
    },
    suggestionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: '#fde68a',
    },
    suggestionName: { fontWeight: '600', color: '#111' },
    suggestionStock: { fontSize: 12, color: '#666' },
    cancelButton: {
      borderRadius: 8,
      padding: 14,
      alignItems: 'center',
      marginTop: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelButtonText: { color: colors.textMuted, fontWeight: '600' },
    selectedLabel: { marginTop: 20, fontWeight: '600', color: colors.primary },
    typeButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
    },
    typeButtonActiveIn: { backgroundColor: colors.green, borderColor: colors.green },
    typeButtonActiveOut: { backgroundColor: colors.red, borderColor: colors.red },
    typeText: { color: colors.text },
    typeTextActive: { color: '#fff', fontWeight: '600' },
    error: { color: colors.red, marginTop: 16 },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 14,
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 40,
    },
    submitButtonText: { color: '#fff', fontWeight: '600' },
  });
}
