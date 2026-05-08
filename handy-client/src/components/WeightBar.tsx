import { View, Text } from 'react-native';
import { colors } from '../theme';

interface Props {
  remaining: number;
  total: number;
}

export default function WeightBar({ remaining, total }: Props) {
  const pct = Math.min(100, Math.round((remaining / total) * 100));
  const barColor =
    pct > 50 ? colors.vibrantGreen : pct > 20 ? colors.lightBlue : colors.vibrantOrange;

  return (
    <View>
      <View className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <View
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </View>
      <View className="flex-row justify-between mt-1">
        <Text className="text-white/40 text-xs">{remaining}g</Text>
        <Text className="text-white/25 text-xs">{pct}%</Text>
      </View>
    </View>
  );
}
