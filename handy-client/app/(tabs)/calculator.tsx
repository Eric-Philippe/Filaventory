import { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCurrency } from '../../src/hooks/useCurrency';
import { colors } from '../../src/theme';

const BASE_FEE = 5;
const PLATE_COST = 4;

export default function CalculatorScreen() {
  const { sym } = useCurrency();
  const [form, setForm] = useState({
    filamentPricePerKg: '',
    filamentWeightG: '',
    printPlateCount: '',
    hoursSpent: '',
  });

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const pricePerKg = parseFloat(form.filamentPricePerKg) || 0;
  const weightG    = parseFloat(form.filamentWeightG)    || 0;
  const plates     = parseFloat(form.printPlateCount)    || 0;
  const hours      = parseFloat(form.hoursSpent)         || 0;

  const filamentCost = pricePerKg * (weightG / 1000);
  const plateCost    = plates * PLATE_COST;
  const labourCost   = hours;
  const total        = BASE_FEE + filamentCost + plateCost + labourCost;

  const hasInput = pricePerKg || weightG || plates || hours;

  const segments = [
    { label: 'Base fee',  value: BASE_FEE,      color: colors.white,         dot: 'rgba(255,255,255,0.6)' },
    { label: 'Filament',  value: filamentCost,   color: colors.vibrantOrange, dot: colors.vibrantOrange },
    { label: 'Plates',    value: plateCost,      color: colors.lightBlue,     dot: colors.lightBlue },
    { label: 'Labour',    value: labourCost,     color: colors.vibrantGreen,  dot: colors.vibrantGreen },
  ];

  const inputs = [
    { key: 'filamentPricePerKg' as const, label: `Filament price / kg`, unit: sym,      placeholder: '25',  hint: `e.g. cost of 1 kg spool` },
    { key: 'filamentWeightG'    as const, label: 'Filament used',         unit: 'g',      placeholder: '120', hint: 'Grams consumed' },
    { key: 'printPlateCount'   as const, label: 'Print plates',           unit: 'plates', placeholder: '3',   hint: `Each plate = ${sym}${PLATE_COST}` },
    { key: 'hoursSpent'        as const, label: 'Hours spent',            unit: 'h',      placeholder: '2',   hint: `Each hour = ${sym}1` },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.deepPurple }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ paddingTop: 4, paddingBottom: 20 }}>
          <Text style={s.h1}>Calculator</Text>
          <Text style={s.sub}>Estimate print job cost</Text>
        </View>

        {/* Formula card */}
        <View style={s.card}>
          <Text style={s.label}>Formula</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <Text style={s.mono}>Total =</Text>
            <Token color="rgba(255,255,255,0.15)" text="rgba(255,255,255,0.7)">
              {sym}5
            </Token>
            <Text style={s.op}>+</Text>
            <Token color="rgba(231,64,17,0.15)" text={colors.vibrantOrange}>
              price/kg × weight_kg
            </Token>
            <Text style={s.op}>+</Text>
            <Token color="rgba(7,180,185,0.15)" text={colors.lightBlue}>
              plates × {sym}{PLATE_COST}
            </Token>
            <Text style={s.op}>+</Text>
            <Token color="rgba(16,185,129,0.15)" text={colors.vibrantGreen}>
              hours
            </Token>
          </View>
        </View>

        {/* Inputs */}
        <View style={s.card}>
          <Text style={s.label}>Project details</Text>
          <View style={{ gap: 16, marginTop: 12 }}>
            {inputs.map(({ key, label, unit, placeholder, hint }) => (
              <View key={key}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{label}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>{hint}</Text>
                </View>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    value={form[key]}
                    onChangeText={set(key)}
                    keyboardType="decimal-pad"
                    placeholder={placeholder}
                    placeholderTextColor="rgba(255,255,255,0.15)"
                    style={s.input}
                  />
                  <Text style={s.inputUnit}>{unit}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Total */}
        <View style={[s.card, { overflow: 'hidden' }]}>
          <Text style={s.label}>Estimated total</Text>
          <Text style={{ color: '#fff', fontSize: 52, fontWeight: '700', marginTop: 8, fontVariant: ['tabular-nums'] }}>
            {sym}{hasInput ? total.toFixed(2) : '0.00'}
          </Text>
        </View>

        {/* Breakdown */}
        {total > 0 && (
          <View style={s.card}>
            <Text style={s.label}>Breakdown</Text>

            {/* Stacked bar */}
            <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 12, marginBottom: 16, gap: 1 }}>
              {segments.map((seg) =>
                seg.value > 0 ? (
                  <View
                    key={seg.label}
                    style={{ flex: seg.value / total, backgroundColor: seg.color, borderRadius: 5 }}
                  />
                ) : null,
              )}
            </View>

            {/* Legend */}
            <View style={{ gap: 10 }}>
              {segments.map((seg) => (
                <View key={seg.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: seg.dot }} />
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{seg.label}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, fontVariant: ['tabular-nums'] }}>
                      {total > 0 ? Math.round((seg.value / total) * 100) : 0}%
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500', width: 64, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
                      {sym}{seg.value.toFixed(2)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Token({ children, color, text }: { children: React.ReactNode; color: string; text: string }) {
  return (
    <View style={{ backgroundColor: color, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
      <Text style={{ color: text, fontSize: 12, fontFamily: 'monospace' }}>{children}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  h1:        { color: '#fff', fontSize: 20, fontWeight: '600' },
  sub:       { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2 },
  card:      { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 20, padding: 20, marginBottom: 12 },
  label:     { color: 'rgba(255,255,255,0.3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  mono:      { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontFamily: 'monospace' },
  op:        { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontFamily: 'monospace' },
  input:     { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 12, paddingHorizontal: 14, paddingRight: 48, paddingVertical: 12, color: '#fff', fontSize: 15 },
  inputUnit: { position: 'absolute', right: 14, top: 0, bottom: 0, textAlignVertical: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, lineHeight: 46 },
});
