import { useState } from 'react';
import { Modal, Pressable, Text, View, StyleSheet } from 'react-native';
import { useLocation, ALL_LOCATIONS_VALUE } from '../context/LocationContext';
import { useTheme } from '../context/ThemeContext';

export function HeaderLocationPicker() {
  const { locations, selectedLocationValue, setSelectedLocationValue, isAllLocations } = useLocation();
  const { colors, card } = useTheme();
  const [open, setOpen] = useState(false);

  if (locations.length === 0) return null;

  const current = isAllLocations ? 'General' : locations.find((l) => l.id === selectedLocationValue)?.name;

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={8} style={{ marginRight: 14, maxWidth: 110 }}>
        <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }} numberOfLines={1}>
          {isAllLocations ? '🏠' : '📍'} {current ?? '...'}
        </Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.title, { color: colors.textMuted }]}>Elegir local</Text>
            <Pressable
              style={styles.row}
              onPress={() => {
                setSelectedLocationValue(ALL_LOCATIONS_VALUE);
                setOpen(false);
              }}
            >
              <Text style={{ color: colors.text, fontWeight: isAllLocations ? '700' : '400' }}>
                {isAllLocations ? '✓ ' : ''}🏠 General (todos los locales)
              </Text>
            </Pressable>
            {locations.map((l) => (
              <Pressable
                key={l.id}
                style={styles.row}
                onPress={() => {
                  setSelectedLocationValue(l.id);
                  setOpen(false);
                }}
              >
                <Text style={{ color: colors.text, fontWeight: l.id === selectedLocationValue ? '700' : '400' }}>
                  {l.id === selectedLocationValue ? '✓ ' : ''}
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
