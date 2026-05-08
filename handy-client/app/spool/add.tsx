import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, Alert,
  ActivityIndicator, Switch, FlatList, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api, type Filament } from '../../src/api/client';
import { colors } from '../../src/theme';

export default function AddSpoolScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedFilament, setSelectedFilament] = useState<Filament | null>(null);
  const [form, setForm] = useState({
    weight: '1000',
    notes: '',
    is_dry: true,
    is_spooled: true,
    rack_id: '',
  });
  const [error, setError] = useState('');

  const { data: filamentRes } = useQuery({
    queryKey: ['filaments-search', search],
    queryFn: () => api.filaments.list({ q: search, per_page: 20 }),
    enabled: search.length > 1 && !selectedFilament,
  });

  const { data: racks = [] } = useQuery({
    queryKey: ['racks'],
    queryFn: () => api.racks.list(),
  });

  const createSpool = useMutation({
    mutationFn: () =>
      api.spools.create({
        id_filament: selectedFilament!.id_filament,
        weight_remaining_grams: Number(form.weight),
        notes: form.notes || undefined,
        is_dry: form.is_dry,
        is_spooled: form.is_spooled,
        id_rack: form.rack_id ? Number(form.rack_id) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spools'] });
      router.back();
    },
    onError: (e: Error) => setError(e.message),
  });

  const handleSubmit = () => {
    setError('');
    if (!selectedFilament) { setError('Select a filament first'); return; }
    if (!form.weight || Number(form.weight) <= 0) { setError('Enter a valid weight'); return; }
    createSpool.mutate();
  };

  const filaments = filamentRes?.data ?? [];

  return (
    <ScrollView
      className="flex-1 bg-deep-purple"
      contentContainerClassName="px-4 py-4 pb-12"
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-white font-semibold text-lg mb-4">Add spool</Text>

      {!!error && (
        <View className="bg-vibrant-orange/15 border border-vibrant-orange/30 rounded-xl px-4 py-3 mb-4">
          <Text className="text-vibrant-orange text-sm">{error}</Text>
        </View>
      )}

      {/* Filament search */}
      <View className="mb-4">
        <Text className="text-white/50 text-xs uppercase tracking-wider mb-2">Filament</Text>
        {selectedFilament ? (
          <View className="bg-white/5 border border-light-blue/30 rounded-2xl p-3 flex-row items-center gap-3">
            <View
              className="w-10 h-10 rounded-lg border border-white/15"
              style={{ backgroundColor: selectedFilament.color_hex }}
            />
            <View className="flex-1">
              <Text className="text-white text-sm font-medium" numberOfLines={1}>
                {selectedFilament.title}
              </Text>
              <Text className="text-white/40 text-xs">
                {selectedFilament.brand?.name} · {selectedFilament.material_type}
              </Text>
            </View>
            <Pressable onPress={() => setSelectedFilament(null)} className="p-1">
              <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.4)" />
            </Pressable>
          </View>
        ) : (
          <View>
            <View className="flex-row items-center bg-white/5 border border-white/10 rounded-xl px-3 gap-2 mb-2">
              <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.3)" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search filament…"
                placeholderTextColor="rgba(255,255,255,0.2)"
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 py-3 text-white text-sm"
              />
            </View>
            {filaments.length > 0 && (
              <View className="bg-[#1a1740] border border-white/15 rounded-xl overflow-hidden">
                {filaments.map((f, i) => (
                  <Pressable
                    key={f.id_filament}
                    onPress={() => {
                      setSelectedFilament(f);
                      setSearch('');
                      setForm((p) => ({ ...p, weight: String(f.weight_grams) }));
                    }}
                    className={`flex-row items-center gap-3 px-3 py-3 active:bg-white/8 ${i > 0 ? 'border-t border-white/8' : ''}`}
                  >
                    <View
                      className="w-8 h-8 rounded-lg border border-white/15"
                      style={{ backgroundColor: f.color_hex }}
                    />
                    <View className="flex-1">
                      <Text className="text-white/80 text-sm" numberOfLines={1}>{f.title}</Text>
                      <Text className="text-white/30 text-xs">{f.brand?.name} · {f.material_type}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Weight */}
      <View className="mb-4">
        <Text className="text-white/50 text-xs uppercase tracking-wider mb-2">
          Weight remaining (g)
        </Text>
        <TextInput
          value={form.weight}
          onChangeText={(v) => setForm((p) => ({ ...p, weight: v }))}
          keyboardType="numeric"
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
        />
      </View>

      {/* Rack */}
      {racks.length > 0 && (
        <View className="mb-4">
          <Text className="text-white/50 text-xs uppercase tracking-wider mb-2">Rack</Text>
          <View className="flex-row flex-wrap gap-2">
            {[{ id_rack: 0, name: 'None' }, ...racks].map((r) => {
              const active = (form.rack_id === '' && r.id_rack === 0) ||
                             form.rack_id === String(r.id_rack);
              return (
                <Pressable
                  key={r.id_rack}
                  onPress={() => setForm((p) => ({ ...p, rack_id: r.id_rack === 0 ? '' : String(r.id_rack) }))}
                  className={`px-3 py-1.5 rounded-lg border ${active ? 'border-light-blue/50 bg-light-blue/10' : 'border-white/10'}`}
                >
                  <Text className={active ? 'text-light-blue text-sm' : 'text-white/40 text-sm'}>
                    {r.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Notes */}
      <View className="mb-4">
        <Text className="text-white/50 text-xs uppercase tracking-wider mb-2">Notes</Text>
        <TextInput
          value={form.notes}
          onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))}
          multiline
          numberOfLines={3}
          placeholder="Optional notes…"
          placeholderTextColor="rgba(255,255,255,0.2)"
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
        />
      </View>

      {/* Status toggles */}
      <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-white/60 text-sm">Dried</Text>
          <Switch
            value={form.is_dry}
            onValueChange={(v) => setForm((p) => ({ ...p, is_dry: v }))}
            trackColor={{ true: colors.vibrantGreen }}
            thumbColor="#fff"
          />
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-white/60 text-sm">On spool</Text>
          <Switch
            value={form.is_spooled}
            onValueChange={(v) => setForm((p) => ({ ...p, is_spooled: v }))}
            trackColor={{ true: colors.lightBlue }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Actions */}
      <View className="flex-row gap-3">
        <Pressable
          onPress={() => router.back()}
          className="flex-1 py-3.5 border border-white/15 rounded-xl items-center active:opacity-80"
        >
          <Text className="text-white/60">Cancel</Text>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={createSpool.isPending}
          className="flex-1 py-3.5 bg-vibrant-orange rounded-xl items-center active:opacity-80"
        >
          {createSpool.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold">Add spool</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}
