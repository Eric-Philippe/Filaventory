import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, Image, Pressable,
  ActivityIndicator, StyleSheet, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, type Filament } from '../api/client';
import { colors } from '../theme';

interface Props {
  value: Filament | null;
  onChange: (f: Filament | null) => void;
  placeholder?: string;
}

export default function FilamentSearchInput({
  value, onChange, placeholder = 'Search filaments…',
}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Filament[]>([]);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounce.current);
    if (!query.trim()) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.filaments.list({ q: query, per_page: 20, page: 1 });
        setResults(res.data);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounce.current);
  }, [query]);

  const select = (f: Filament) => {
    onChange(f);
    setQuery('');
    setResults([]);
  };

  const clear = () => {
    onChange(null);
    setQuery('');
    setResults([]);
  };

  // When a filament is selected, show preview card instead of search
  if (value) {
    return (
      <View style={s.selectedCard}>
        {value.image_url ? (
          <Image source={{ uri: value.image_url }} style={s.selectedImg} resizeMode="cover" />
        ) : (
          <View style={[s.selectedImg, { backgroundColor: value.color_hex }]} />
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.selectedTitle} numberOfLines={1}>{value.title}</Text>
          <Text style={s.selectedSub}>{value.brand?.name} · {value.material_type}</Text>
        </View>
        <Pressable onPress={clear} hitSlop={12}>
          <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.3)" />
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      {/* Search input */}
      <View style={s.inputRow}>
        <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.3)" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.2)"
          style={s.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {loading && <ActivityIndicator size="small" color={colors.lightBlue} />}
      </View>

      {/* Results */}
      {results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(f) => f.id_filament}
          scrollEnabled={false}
          style={s.results}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item: f }) => (
            <Pressable style={s.row} onPress={() => select(f)}>
              {f.image_url ? (
                <Image source={{ uri: f.image_url }} style={s.thumb} resizeMode="cover" />
              ) : (
                <View style={[s.thumb, { backgroundColor: f.color_hex }]} />
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.rowTitle} numberOfLines={1}>{f.title}</Text>
                <Text style={s.rowSub} numberOfLines={1}>
                  {f.brand?.name} · {f.material_type}
                </Text>
              </View>
              <View style={[s.dot, { backgroundColor: f.color_hex }]} />
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={s.sep} />}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12, paddingHorizontal: 12,
  },
  input: { flex: 1, color: '#fff', fontSize: 14, paddingVertical: 12 },
  results: {
    marginTop: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
    maxHeight: 260,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  thumb: { width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  rowTitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '500' },
  rowSub:   { color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 1 },
  dot:      { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  sep:      { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 10 },
  selectedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 12,
    backgroundColor: 'rgba(7,180,185,0.08)',
    borderWidth: 1, borderColor: 'rgba(7,180,185,0.25)',
  },
  selectedImg:   { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  selectedTitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '500' },
  selectedSub:   { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },
});
