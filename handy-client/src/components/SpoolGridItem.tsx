import { View, Text, Image, Pressable } from 'react-native';
import type { Spool } from '../api/client';
import WeightBar from './WeightBar';

const SWATCH_HEIGHT = 130;

interface Props {
  spool: Spool;
  onPress: () => void;
}

export default function SpoolGridItem({ spool, onPress }: Props) {
  const f = spool.filament;
  const weightPct = f ? Math.round((spool.weight_remaining_grams / f.weight_grams) * 100) : 0;

  return (
    <Pressable
      onPress={onPress}
      style={{ flex: 1, marginBottom: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)' }}
    >
      {/* Swatch / image */}
      <View style={{ height: SWATCH_HEIGHT, width: '100%', backgroundColor: f?.color_hex ?? '#808080' }}>
        {f?.image_url ? (
          <Image
            source={{ uri: f.image_url }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            resizeMode="cover"
          />
        ) : null}
        {/* Percentage badge always shown */}
        <View style={{ position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '600' }}>
            {weightPct}%
          </Text>
        </View>
      </View>

      {/* Info */}
      <View style={{ padding: 8 }}>
        <Text style={{ color: 'rgba(255,255,255,0.9)', fontWeight: '500', fontSize: 11, lineHeight: 15 }} numberOfLines={2}>
          {f?.title ?? '—'}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2, marginBottom: 6 }} numberOfLines={1}>
          {f?.material_type ?? '—'}
        </Text>
        {f && (
          <WeightBar remaining={spool.weight_remaining_grams} total={f.weight_grams} />
        )}
      </View>
    </Pressable>
  );
}
