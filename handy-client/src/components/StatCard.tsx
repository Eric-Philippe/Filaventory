import { View, Text } from 'react-native';

interface Props {
  label: string;
  value: string | number;
  accentColor: string;
}

export default function StatCard({ label, value, accentColor }: Props) {
  return (
    <View className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-3 py-3 flex-row items-center gap-2.5">
      <View className="w-1 h-8 rounded-full" style={{ backgroundColor: accentColor }} />
      <View>
        <Text className="text-white/40 text-xs uppercase tracking-wider">{label}</Text>
        <Text className="text-white font-semibold text-base">{value}</Text>
      </View>
    </View>
  );
}
