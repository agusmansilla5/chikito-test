import { useState } from 'react';
import { Modal, Pressable, Text, View, StyleSheet } from 'react-native';
import { useLocation } from '../context/LocationContext';
import { useTheme } from '../context/ThemeContext';

export function HeaderLocationPicker() {
  const { locations, selectedLocationId, setSelectedLocationId } = useLocation();
  const { colors, card } = useTheme();
  const [open, setOpen] = useState(false);

  if (locations.length === 0) return null;

  const current = locations.find((l) => l.id === selectedLocationId);

  if (locations.length === 1) {
    return (
      <Text style={{ color: colors.textMuted, fontSize: 12, marginRight: 12 }} numberOfLines={1}>
        📍 {locations[0].name}
      </Text>
    );
  }

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={8} style={{ marginRight: 14, maxWidth: 110 }}>
        <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }} numberOfLines={1}>
          📍 {current?.name ?? '...'}
        </Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.title, { color: colors.textMuted }]}>Elegir local</Text>
            {locations.map((l) => (
              <Pressable
                key={l.id}
                style={styles.row}
                onPress={() => {
                  setSelectedLocationId(l.id);
                  setOpen(false);
                }}
              >
                <Text style={{ color: colors.text, fontWeight: l.id === selectedLocationId ? '700' : '400' }}>
                  {l.id === selectedLocationId ? '✓ ' : ''}
                  {l.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  sheet: { borderRadius: 12, padding: 12, minWidth: 220 },
  title: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6, paddingHorizontal: 8 },
  row: { paddingVertical: 12, paddingHorizontal: 8 },
});
