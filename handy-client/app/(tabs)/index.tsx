import { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TextInput, Pressable, ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api, type Spool } from '../../src/api/client';
import SpoolListItem from '../../src/components/SpoolListItem';
import SpoolGridItem from '../../src/components/SpoolGridItem';
import MobileRackView from '../../src/components/MobileRackView';
import StatCard from '../../src/components/StatCard';
import { colors } from '../../src/theme';

type ViewMode = 'list' | 'grid' | 'rack';

export default function InventoryScreen() {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('list');
  const router = useRouter();

  const { data: spools = [], isLoading } = useQuery({
    queryKey: ['spools'],
    queryFn: () => api.spools.list(),
  });

  const { data: racks = [] } = useQuery({
    queryKey: ['racks'],
    queryFn: () => api.racks.list(),
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return spools;
    const q = search.toLowerCase();
    return spools.filter(
      (s) =>
        s.filament?.title?.toLowerCase().includes(q) ||
        s.filament?.brand?.name?.toLowerCase().includes(q) ||
        s.filament?.material_type?.toLowerCase().includes(q),
    );
  }, [spools, search]);

  const totalWeight = spools.reduce((s, sp) => s + sp.weight_remaining_grams, 0);
  const materials = [...new Set(spools.map((s) => s.filament?.material_type).filter(Boolean))];

  const header = (
    <View>
      {/* Header row */}
      <View className="flex-row items-center justify-between pt-2 pb-4">
        <View>
          <Text className="text-white font-semibold text-xl">Inventory</Text>
          <Text className="text-white/40 text-xs mt-0.5">
            {spools.length} spools · {(totalWeight / 1000).toFixed(1)} kg
          </Text>
        </View>

        {/* View toggle */}
        <View className="flex-row bg-white/5 rounded-xl overflow-hidden border border-white/10">
          {([
            { mode: 'list' as ViewMode, icon: 'list-outline' },
            { mode: 'grid' as ViewMode, icon: 'grid-outline' },
            { mode: 'rack' as ViewMode, icon: 'layers-outline' },
          ] as const).map(({ mode, icon }) => (
            <Pressable
              key={mode}
              onPress={() => setView(mode)}
              className={`px-3 py-2 ${view === mode ? 'bg-white/10' : ''}`}
            >
              <Ionicons
                name={icon}
                size={18}
                color={view === mode ? colors.lightBlue : 'rgba(255,255,255,0.35)'}
              />
            </Pressable>
          ))}
        </View>
      </View>

      {/* Stats */}
      <View className="flex-row gap-2 mb-4">
        <StatCard label="Spools" value={spools.length} accentColor={colors.lightBlue} />
        <StatCard
          label="Weight"
          value={`${(totalWeight / 1000).toFixed(1)} kg`}
          accentColor={colors.vibrantOrange}
        />
        <StatCard label="Materials" value={materials.length} accentColor={colors.vibrantGreen} />
      </View>

      {/* Search */}
      <View className="flex-row items-center bg-white/5 border border-white/10 rounded-xl px-3 mb-4 gap-2">
        <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.3)" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search filament, brand, material…"
          placeholderTextColor="rgba(255,255,255,0.2)"
          className="flex-1 py-3 text-white text-sm"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {!!search && (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.3)" />
          </Pressable>
        )}
      </View>
    </View>
  );

  const empty = isLoading ? (
    <View className="items-center py-16">
      <ActivityIndicator color={colors.lightBlue} />
    </View>
  ) : (
    <View className="items-center py-16">
      <Text className="text-white/30 text-sm">
        {search ? 'No results.' : 'No spools yet.'}
      </Text>
    </View>
  );

  // Rack view: MobileRackView owns the ScrollView so it can disable it during drag
  if (view === 'rack') {
    return (
      <SafeAreaView className="flex-1 bg-deep-purple" edges={['top']}>
        <MobileRackView
          spools={filtered}
          racks={racks}
          onPress={(s) => router.push(`/spool/${s.id_spool}`)}
          header={<View style={{ paddingBottom: 4 }}>{header}{filtered.length === 0 ? empty : null}</View>}
        />
        <FAB onPress={() => router.push('/spool/add')} />
      </SafeAreaView>
    );
  }

  // Grid: 2 columns, need key to force FlatList remount on mode change
  if (view === 'grid') {
    return (
      <SafeAreaView className="flex-1 bg-deep-purple" edges={['top']}>
        <FlatList
          key="grid"
          data={filtered}
          keyExtractor={(s) => String(s.id_spool)}
          numColumns={3}
          columnWrapperStyle={{ gap: 8, paddingHorizontal: 16 }}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListHeaderComponent={<View style={{ paddingHorizontal: 16 }}>{header}</View>}
          renderItem={({ item }) => (
            <SpoolGridItem
              spool={item}
              onPress={() => router.push(`/spool/${item.id_spool}`)}
            />
          )}
          ListEmptyComponent={empty}
        />
        <FAB onPress={() => router.push('/spool/add')} />
      </SafeAreaView>
    );
  }

  // List (default)
  return (
    <SafeAreaView className="flex-1 bg-deep-purple" edges={['top']}>
      <FlatList
        key="list"
        data={filtered}
        keyExtractor={(s) => String(s.id_spool)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <SpoolListItem
            spool={item}
            onPress={() => router.push(`/spool/${item.id_spool}`)}
          />
        )}
        ListEmptyComponent={empty}
      />
      <FAB onPress={() => router.push('/spool/add')} />
    </SafeAreaView>
  );
}

function FAB({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="absolute bottom-8 right-6 w-14 h-14 bg-vibrant-orange rounded-full items-center justify-center active:opacity-80"
      style={{ elevation: 6 }}
    >
      <Ionicons name="add" size={28} color="#fff" />
    </Pressable>
  );
}
