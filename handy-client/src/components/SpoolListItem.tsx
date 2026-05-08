import { View, Text, Image, Pressable } from 'react-native';
import type { Spool } from '../api/client';
import WeightBar from './WeightBar';

interface Props {
  spool: Spool;
  onPress: () => void;
}

export default function SpoolListItem({ spool, onPress }: Props) {
  const f = spool.filament;
  const weightPct = f ? Math.round((spool.weight_remaining_grams / f.weight_grams) * 100) : 0;

  return (
    <Pressable
      onPress={onPress}
      className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-3 active:bg-white/10"
    >
      <View className="flex-row items-start gap-3 mb-3">
        {/* Swatch or image */}
        {f?.image_url ? (
          <Image
            source={{ uri: f.image_url }}
            className="w-12 h-12 rounded-xl border border-white/15"
            resizeMode="cover"
          />
        ) : (
          <View
            className="w-12 h-12 rounded-xl border border-white/15"
            style={{ backgroundColor: f?.color_hex ?? '#808080' }}
          />
        )}

        <View className="flex-1 min-w-0">
          <Text className="text-white/90 font-medium text-sm" numberOfLines={1}>
            {f?.title ?? '—'}
          </Text>
          <Text className="text-white/40 text-xs mt-0.5" numberOfLines={1}>
            {f?.brand?.name ?? '—'}
          </Text>
          <View className="flex-row items-center gap-2 mt-1.5">
            <View
              className="w-2.5 h-2.5 rounded-full border border-white/20"
              style={{ backgroundColor: f?.color_hex ?? '#808080' }}
            />
            <View className="bg-white/8 rounded-full px-2 py-0.5">
              <Text className="text-white/60 text-xs">{f?.material_type ?? '—'}</Text>
            </View>
            {spool.rack && (
              <Text className="text-white/30 text-xs" numberOfLines={1}>
                {spool.rack.name}
              </Text>
            )}
          </View>
        </View>

        <Text className="text-white/50 font-semibold text-sm tabular-nums">
          {weightPct}%
        </Text>
      </View>

      {f && (
        <WeightBar remaining={spool.weight_remaining_grams} total={f.weight_grams} />
      )}

      {/* Badges */}
      {(spool.rfid_tag || !spool.is_dry || !spool.is_spooled) && (
        <View className="flex-row gap-1.5 mt-2 flex-wrap">
          {spool.rfid_tag && (
            <View className="bg-deep-purple/60 border border-light-blue/20 rounded px-1.5 py-0.5">
              <Text className="text-light-blue/80 text-xs">RFID</Text>
            </View>
          )}
          {!spool.is_dry && (
            <View className="bg-vibrant-orange/15 rounded px-1.5 py-0.5">
              <Text className="text-vibrant-orange/80 text-xs">Needs drying</Text>
            </View>
          )}
          {!spool.is_spooled && (
            <View className="bg-vibrant-orange/20 rounded px-1.5 py-0.5">
              <Text className="text-vibrant-orange/80 text-xs">Refill</Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}
