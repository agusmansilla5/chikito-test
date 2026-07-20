import { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl, TextInput, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLocation } from '../context/LocationContext';
import type { ThemeColors, ThemeCard } from '../theme';
import type { Audit } from '../types';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Audits'>;

export default function AuditsScreen({ navigation }: Props) {
  const { session, profile } = useAuth();
  const { colors, card } = useTheme();
  const { selectedLocationId } = useLocation();
  const styles = useMemo(() => createStyles(colors, card), [colors, card]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canStart = profile?.role === 'admin' || profile?.role === 'auditor';

  const loadAudits = useCallback(async () => {
    if (!selectedLocationId) return;
    const { data } = await supabase
      .from('audits')
      .select('*, profiles(full_name)')
      .eq('location_id', selectedLocationId)
      .order('started_at', { ascending: false });
    setAudits((data as Audit[]) ?? []);
  }, [selectedLocationId]);

  useFocusEffect(
    useCallback(() => {
      loadAudits();
    }, [loadAudits])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await loadAudits();
    setRefreshing(false);
  }

  async function handleStartAudit() {
    if (!session || !selectedLocationId) return;
    setError(null);
    setSubmitting(true);
    const { error: insertError } = await supabase.from('audits').insert({
      started_by: session.user.id,
      note: note.trim() || null,
      location_id: selectedLocationId,
    });
    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setNote('');
    loadAudits();
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      ListHeaderComponent={
        <View style={{ paddingHorizontal: 16 }}>
          {canStart && (
            <View style={styles.startBox}>
              <Text style={styles.startLabel}>Iniciar auditoría de hoy</Text>
              <TextInput
                style={styles.input}
                placeholder="Nota (opcional, ej: conteo de bebidas)"
                placeholderTextColor={colors.textMuted}
                value={note}
                onChangeText={setNote}
              />
              {error && <Text style={styles.error}>{error}</Text>}
              <Pressable style={styles.startButton} onPress={handleStartAudit} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.startButtonText}>+ Iniciar auditoría</Text>
                )}
              </Pressable>
            </View>
          )}

          <Text style={styles.sectionTitle}>Historial</Text>
        </View>
      }
      data={audits}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={<Text style={styles.empty}>Todavía no se inició ninguna auditoría.</Text>}
      renderItem={({ item }) => {
        const isOpen = !item.ended_at;
        return (
          <View style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.date}>
                {new Date(item.started_at).toLocaleDateString('es-AR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
              <View style={[styles.statusBadge, isOpen ? styles.statusOpen : styles.statusClosed]}>
                <Text style={isOpen ? styles.statusOpenText : styles.statusClosedText}>
                  {isOpen ? 'En curso' : 'Cerrada'}
                </Text>
              </View>
            </View>
            <Text style={styles.meta}>
              Inicio: {new Date(item.started_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              {item.ended_at &&
                ` · Cierre: ${new Date(item.ended_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`}
              {' · '}
              {item.profiles?.full_name ?? '—'}
            </Text>
            <View style={styles.rowFooter}>
              {item.note ? <Text style={styles.note}>{item.note}</Text> : <View />}
              <Pressable onPress={() => navigation.navigate('AuditDetail', { auditId: item.id })}>
                <Text style={styles.detailLink}>Ver detalle ›</Text>
              </Pressable>
            </View>
          </View>
        );
      }}
    />
  );
}

function createStyles(colors: ThemeColors, card: ThemeCard) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    title: { fontSize: 22, fontWeight: '700', marginBottom: 16, color: colors.text },
    startBox: { ...card, padding: 14, marginBottom: 20 },
    startLabel: { fontWeight: '600', marginBottom: 8, color: colors.text },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 10,
      backgroundColor: colors.background,
      color: colors.text,
      marginBottom: 8,
    },
    startButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
    },
    startButtonText: { color: '#fff', fontWeight: '600' },
    error: { color: colors.red, marginBottom: 8 },
    sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: colors.text },
    row: {
      ...card,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginHorizontal: 16,
      marginBottom: 8,
    },
    rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    date: { fontWeight: '600', color: colors.text },
    statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
    statusOpen: { backgroundColor: colors.primarySoft },
    statusClosed: { backgroundColor: colors.border },
    statusOpenText: { fontSize: 11, fontWeight: '700', color: colors.primary },
    statusClosedText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
    meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    note: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic', flexShrink: 1, marginRight: 8 },
    rowFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    detailLink: { color: colors.primary, fontWeight: '600', fontSize: 13 },
    empty: { textAlign: 'center', marginTop: 24, color: colors.textMuted, paddingHorizontal: 16 },
  });
}
