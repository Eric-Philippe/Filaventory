import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable, Alert,
  ActivityIndicator, Image, StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api/client';
import WeightBar from '../../src/components/WeightBar';
import WeightSlider from '../../src/components/WeightSlider';
import { colors } from '../../src/theme';

export default function SpoolDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const qc = useQueryClient();
  const spoolId = Number(id);

  const { data: spool, isLoading } = useQuery({
    queryKey: ['spool', spoolId],
    queryFn: () => api.spools.get(spoolId),
    enabled: !!spoolId,
  });

  const { data: racks = [] } = useQuery({
    queryKey: ['racks'],
    queryFn: () => api.racks.list(),
  });

  const { data: prefs } = useQuery({
    queryKey: ['prefs', spool?.id_filament],
    queryFn: () => api.preferences.get(spool!.id_filament),
    enabled: !!spool?.id_filament,
    retry: false,
  });

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    weight: '',
    notes: '',
    is_dry: true,
    is_spooled: true,
    id_rack: '',
  });

  const [rfidInput, setRfidInput] = useState('');
  const [prefForm, setPrefForm] = useState({
    nozzle_temp_override: '',
    bed_temp_override: '',
    ironing_flow: '',
    ironing_speed: '',
    notes: '',
  });
  const [prefSaved, setPrefSaved] = useState(false);

  useEffect(() => {
    if (spool) {
      setEditForm({
        weight: String(spool.weight_remaining_grams),
        notes: spool.notes ?? '',
        is_dry: spool.is_dry,
        is_spooled: spool.is_spooled,
        id_rack: spool.id_rack ? String(spool.id_rack) : '',
      });
      navigation.setOptions({ title: spool.filament?.title ?? 'Spool' });
    }
  }, [spool]);

  useEffect(() => {
    if (prefs) {
      setPrefForm({
        nozzle_temp_override: prefs.nozzle_temp_override ? String(prefs.nozzle_temp_override) : '',
        bed_temp_override: prefs.bed_temp_override ? String(prefs.bed_temp_override) : '',
        ironing_flow: prefs.ironing_flow ? String(prefs.ironing_flow) : '',
        ironing_speed: prefs.ironing_speed ? String(prefs.ironing_speed) : '',
        notes: prefs.notes ?? '',
      });
    }
  }, [prefs]);

  const updateSpool = useMutation({
    mutationFn: () =>
      api.spools.update(spoolId, {
        weight_remaining_grams: Number(editForm.weight),
        notes: editForm.notes || undefined,
        is_dry: editForm.is_dry,
        is_spooled: editForm.is_spooled,
        id_rack: editForm.id_rack ? Number(editForm.id_rack) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spool', spoolId] });
      qc.invalidateQueries({ queryKey: ['spools'] });
      setEditing(false);
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const deleteSpool = useMutation({
    mutationFn: () => api.spools.delete(spoolId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spools'] });
      router.back();
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const assignRFID = useMutation({
    mutationFn: () => api.rfid.assign(spoolId, rfidInput.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spool', spoolId] });
      qc.invalidateQueries({ queryKey: ['spools'] });
      setRfidInput('');
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  const unassignRFID = useMutation({
    mutationFn: () => api.rfid.unassign(spoolId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spool', spoolId] });
      qc.invalidateQueries({ queryKey: ['spools'] });
    },
  });

  const savePrefs = useMutation({
    mutationFn: () =>
      api.preferences.upsert(spool!.id_filament, {
        nozzle_temp_override: prefForm.nozzle_temp_override ? Number(prefForm.nozzle_temp_override) : undefined,
        bed_temp_override: prefForm.bed_temp_override ? Number(prefForm.bed_temp_override) : undefined,
        ironing_flow: prefForm.ironing_flow ? Number(prefForm.ironing_flow) : undefined,
        ironing_speed: prefForm.ironing_speed ? Number(prefForm.ironing_speed) : undefined,
        notes: prefForm.notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prefs', spool?.id_filament] });
      setPrefSaved(true);
      setTimeout(() => setPrefSaved(false), 2000);
    },
    onError: (e: Error) => Alert.alert('Error', e.message),
  });

  if (isLoading || !spool) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.deepPurple, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.lightBlue} />
      </View>
    );
  }

  const f = spool.filament;
  const weightMax = f?.weight_grams ?? 1000;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.deepPurple }} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <View style={{ height: 260, width: '100%', backgroundColor: f?.color_hex ?? '#808080' }}>
        {f?.image_url && (
          <Image source={{ uri: f.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        )}
        {/* Gradient overlay */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, backgroundColor: 'rgba(17,12,40,0.85)' }} />

        {/* Info */}
        <View style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700', lineHeight: 30 }} numberOfLines={2}>
            {f?.title ?? '—'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14 }}>{f?.brand?.name}</Text>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '500' }}>{f?.material_type}</Text>
            </View>
            {spool.rack && (
              <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{spool.rack.name}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={{ padding: 16 }}>

        {/* ── Status badges ─────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <View style={[s.badge, spool.is_dry ? s.badgeGreen : s.badgeOrange]}>
            <Ionicons
              name={spool.is_dry ? 'checkmark-circle-outline' : 'water-outline'}
              size={14}
              color={spool.is_dry ? colors.vibrantGreen : colors.vibrantOrange}
            />
            <Text style={[s.badgeText, { color: spool.is_dry ? colors.vibrantGreen : colors.vibrantOrange }]}>
              {spool.is_dry ? 'Dried' : 'Needs drying'}
            </Text>
          </View>
          {!spool.is_spooled && (
            <View style={[s.badge, s.badgeOrange]}>
              <Text style={[s.badgeText, { color: colors.vibrantOrange }]}>Refill</Text>
            </View>
          )}
          {spool.rfid_tag && (
            <View style={[s.badge, s.badgeBlue]}>
              <Ionicons name="wifi-outline" size={14} color={colors.lightBlue} />
              <Text style={[s.badgeText, { color: colors.lightBlue }]} numberOfLines={1}>{spool.rfid_tag}</Text>
            </View>
          )}
        </View>

        {/* ── Weight card ───────────────────────────────────────────── */}
        <View style={s.card}>
          <Text style={s.cardLabel}>Weight remaining</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 6, marginBottom: 14 }}>
            <Text style={{ color: '#fff', fontSize: 48, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
              {spool.weight_remaining_grams}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18, marginBottom: 4 }}>g</Text>
            {f && (
              <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14, marginBottom: 2 }}>
                {' '}/ {f.weight_grams}g
              </Text>
            )}
          </View>
          {f && <WeightBar remaining={spool.weight_remaining_grams} total={f.weight_grams} />}
        </View>

        {/* ── Temp cards ────────────────────────────────────────────── */}
        {(f?.nozzle_temp_min || f?.bed_temp_min || f?.dry_temp) && (
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            {f?.nozzle_temp_min != null && (
              <View style={[s.card, s.tempCard]}>
                <Ionicons name="flame-outline" size={22} color={colors.vibrantOrange} />
                <Text style={s.tempLabel}>Nozzle</Text>
                <Text style={s.tempValue}>{f.nozzle_temp_min}–{f.nozzle_temp_max}°</Text>
              </View>
            )}
            {f?.bed_temp_min != null && (
              <View style={[s.card, s.tempCard]}>
                <Ionicons name="layers-outline" size={22} color={colors.lightBlue} />
                <Text style={s.tempLabel}>Bed</Text>
                <Text style={s.tempValue}>{f.bed_temp_min}–{f.bed_temp_max}°</Text>
              </View>
            )}
            {f?.dry_temp != null && (
              <View style={[s.card, s.tempCard]}>
                <Ionicons name="sunny-outline" size={22} color={colors.vibrantGreen} />
                <Text style={s.tempLabel}>Dry</Text>
                <Text style={s.tempValue}>{f.dry_temp}° · {f.dry_time}h</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Edit section ──────────────────────────────────────────── */}
        {editing ? (
          <View style={[s.card, { marginBottom: 12 }]}>
            <Text style={s.cardLabel}>Edit</Text>

            {/* Weight slider */}
            <View style={{ marginTop: 14, marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Weight remaining</Text>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{editForm.weight}g</Text>
              </View>
              <WeightSlider
                value={Number(editForm.weight) || 0}
                max={weightMax}
                onChange={(v) => setEditForm((p) => ({ ...p, weight: String(v) }))}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>0g</Text>
                <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>{weightMax}g</Text>
              </View>
            </View>

            {/* Rack */}
            {racks.length > 0 && (
              <View style={{ marginBottom: 14 }}>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 8 }}>Rack</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[{ id_rack: 0, name: 'None' }, ...racks].map((r) => {
                    const active = (editForm.id_rack === '' && r.id_rack === 0) ||
                      editForm.id_rack === String(r.id_rack);
                    return (
                      <Pressable
                        key={r.id_rack}
                        onPress={() => setEditForm((p) => ({ ...p, id_rack: r.id_rack === 0 ? '' : String(r.id_rack) }))}
                        style={[s.pill, active && s.pillActive]}
                      >
                        <Text style={{ color: active ? colors.lightBlue : 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                          {r.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Toggles */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              <Pressable
                onPress={() => setEditForm((p) => ({ ...p, is_dry: !p.is_dry }))}
                style={[s.toggleBtn, editForm.is_dry && { borderColor: colors.vibrantGreen, backgroundColor: 'rgba(16,185,129,0.08)' }]}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={editForm.is_dry ? colors.vibrantGreen : 'rgba(255,255,255,0.3)'} />
                <Text style={{ color: editForm.is_dry ? colors.vibrantGreen : 'rgba(255,255,255,0.4)', fontSize: 13 }}>Dried</Text>
              </Pressable>
              <Pressable
                onPress={() => setEditForm((p) => ({ ...p, is_spooled: !p.is_spooled }))}
                style={[s.toggleBtn, editForm.is_spooled && { borderColor: colors.lightBlue, backgroundColor: 'rgba(7,180,185,0.08)' }]}
              >
                <Ionicons name="reload-outline" size={18} color={editForm.is_spooled ? colors.lightBlue : 'rgba(255,255,255,0.3)'} />
                <Text style={{ color: editForm.is_spooled ? colors.lightBlue : 'rgba(255,255,255,0.4)', fontSize: 13 }}>On spool</Text>
              </Pressable>
            </View>

            {/* Notes */}
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 6 }}>Notes</Text>
            <TextInput
              value={editForm.notes}
              onChangeText={(v) => setEditForm((p) => ({ ...p, notes: v }))}
              multiline
              numberOfLines={3}
              placeholder="Optional…"
              placeholderTextColor="rgba(255,255,255,0.15)"
              style={s.input}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Pressable onPress={() => setEditing(false)} style={s.cancelBtn}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => updateSpool.mutate()}
                disabled={updateSpool.isPending}
                style={s.saveBtn}
              >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                  {updateSpool.isPending ? 'Saving…' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setEditing(true)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 16, paddingVertical: 14, marginBottom: 12 }}
          >
            <Ionicons name="pencil-outline" size={16} color="rgba(255,255,255,0.5)" />
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Edit spool</Text>
          </Pressable>
        )}

        {/* ── RFID ──────────────────────────────────────────────────── */}
        <View style={[s.card, { marginBottom: 12 }]}>
          <Text style={s.cardLabel}>RFID</Text>
          {spool.rfid_tag ? (
            <View style={{ marginTop: 10 }}>
              <View style={{ backgroundColor: 'rgba(7,180,185,0.06)', borderWidth: 1, borderColor: 'rgba(7,180,185,0.2)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10 }}>
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginBottom: 2 }}>Assigned tag</Text>
                <Text style={{ color: colors.lightBlue, fontSize: 14, fontFamily: 'monospace' }}>{spool.rfid_tag}</Text>
              </View>
              <Pressable
                onPress={() =>
                  Alert.alert('Remove RFID', 'Unassign this tag?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => unassignRFID.mutate() },
                  ])
                }
                style={{ paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(231,64,17,0.3)', borderRadius: 12, alignItems: 'center' }}
              >
                <Text style={{ color: 'rgba(231,64,17,0.8)', fontSize: 14 }}>Remove tag</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TextInput
                value={rfidInput}
                onChangeText={setRfidInput}
                placeholder="Tag UID…"
                placeholderTextColor="rgba(255,255,255,0.2)"
                autoCapitalize="none"
                style={[s.input, { flex: 1 }]}
              />
              <Pressable
                onPress={() => rfidInput.trim() && assignRFID.mutate()}
                disabled={assignRFID.isPending || !rfidInput.trim()}
                style={{ backgroundColor: 'rgba(7,180,185,0.15)', borderWidth: 1, borderColor: 'rgba(7,180,185,0.3)', borderRadius: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: colors.lightBlue, fontSize: 14 }}>Assign</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ── Preferences ───────────────────────────────────────────── */}
        <View style={[s.card, { marginBottom: 12 }]}>
          <Text style={s.cardLabel}>Preferences</Text>
          {prefSaved && (
            <View style={{ backgroundColor: 'rgba(16,185,129,0.10)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginTop: 10 }}>
              <Text style={{ color: colors.vibrantGreen, fontSize: 13 }}>Saved!</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12, marginBottom: 10 }}>
            {([
              { key: 'nozzle_temp_override' as const, label: 'Nozzle override (°C)' },
              { key: 'bed_temp_override' as const, label: 'Bed override (°C)' },
              { key: 'ironing_flow' as const, label: 'Ironing flow (%)' },
              { key: 'ironing_speed' as const, label: 'Speed (mm/s)' },
            ]).map(({ key, label }) => (
              <View key={key} style={{ width: '47%' }}>
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginBottom: 4 }}>{label}</Text>
                <TextInput
                  value={prefForm[key]}
                  onChangeText={(v) => setPrefForm((p) => ({ ...p, [key]: v }))}
                  keyboardType="numeric"
                  placeholder="—"
                  placeholderTextColor="rgba(255,255,255,0.15)"
                  style={s.input}
                />
              </View>
            ))}
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginBottom: 6 }}>Notes</Text>
          <TextInput
            value={prefForm.notes}
            onChangeText={(v) => setPrefForm((p) => ({ ...p, notes: v }))}
            multiline
            numberOfLines={2}
            placeholder="Print settings, observations…"
            placeholderTextColor="rgba(255,255,255,0.15)"
            style={[s.input, { marginBottom: 12 }]}
          />
          <Pressable
            onPress={() => savePrefs.mutate()}
            disabled={savePrefs.isPending || !spool}
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '500', fontSize: 14 }}>
              {savePrefs.isPending ? 'Saving…' : 'Save preferences'}
            </Text>
          </Pressable>
        </View>

        {/* ── Delete ────────────────────────────────────────────────── */}
        <Pressable
          onPress={() =>
            Alert.alert('Delete spool', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => deleteSpool.mutate() },
            ])
          }
          style={{ borderWidth: 1, borderColor: 'rgba(231,64,17,0.2)', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}
        >
          <Text style={{ color: 'rgba(231,64,17,0.7)', fontSize: 14 }}>Delete spool</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tempCard: {
    flex: 1,
    alignItems: 'flex-start',
  },
  tempLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    marginTop: 8,
  },
  tempValue: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 3,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeText: { fontSize: 13, fontWeight: '500' },
  badgeGreen: { backgroundColor: 'rgba(16,185,129,0.10)', borderColor: 'rgba(16,185,129,0.25)' },
  badgeOrange: { backgroundColor: 'rgba(231,64,17,0.10)', borderColor: 'rgba(231,64,17,0.25)' },
  badgeBlue: { backgroundColor: 'rgba(7,180,185,0.10)', borderColor: 'rgba(7,180,185,0.25)' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 14,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  pillActive: {
    borderColor: 'rgba(7,180,185,0.5)',
    backgroundColor: 'rgba(7,180,185,0.08)',
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.vibrantOrange,
    alignItems: 'center',
  },
});
