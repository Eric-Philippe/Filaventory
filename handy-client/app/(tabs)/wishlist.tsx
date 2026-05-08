import { useState } from 'react';
import {
  View, Text, FlatList, Pressable, Alert, ActivityIndicator,
  Image, TextInput, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api, type WishlistItem, type Filament } from '../../src/api/client';
import { useCurrency } from '../../src/hooks/useCurrency';
import Sheet from '../../src/components/Sheet';
import FilamentSearchInput from '../../src/components/FilamentSearchInput';
import StatCard from '../../src/components/StatCard';
import { colors } from '../../src/theme';

const PRIORITY_LABEL: Record<number, { label: string; color: string }> = {
  1:    { label: 'High',   color: colors.vibrantOrange },
  0:    { label: 'Normal', color: 'rgba(255,255,255,0.4)' },
  [-1]: { label: 'Low',   color: 'rgba(255,255,255,0.2)' },
};

// ─── Add / Edit form ──────────────────────────────────────────────────────────

interface FormProps {
  item?: WishlistItem | null;
  onDone: () => void;
}

function WishlistForm({ item, onDone }: FormProps) {
  const qc = useQueryClient();
  const { sym } = useCurrency();

  const [filament, setFilament] = useState<Filament | null>(item?.filament ?? null);
  const [qty, setQty] = useState(String(item?.quantity_spools ?? '1'));
  const [price, setPrice] = useState(String(item?.desired_price ?? ''));
  const [url, setUrl] = useState(item?.purchase_url ?? '');
  const [comment, setComment] = useState(item?.comment ?? '');
  const [priority, setPriority] = useState<-1 | 0 | 1>(item?.priority ?? 0);
  const [error, setError] = useState('');

  const save = useMutation({
    mutationFn: () => {
      const body = {
        quantity_spools: Number(qty) || 1,
        desired_price: price ? Number(price) : undefined,
        purchase_url: url || undefined,
        comment: comment || undefined,
        priority,
      };
      return item
        ? api.wishlist.update(item.id_wish, body)
        : api.wishlist.create({ id_filament: filament!.id_filament, ...body });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wishlist'] }); onDone(); },
    onError: (e: Error) => setError(e.message),
  });

  const canSave = item ? true : !!filament;

  return (
    <View style={{ gap: 16 }}>
      {!!error && (
        <View style={f.errBox}>
          <Text style={f.errText}>{error}</Text>
        </View>
      )}

      {/* Filament picker (only for new items) */}
      {!item && (
        <View>
          <Text style={f.label}>Filament</Text>
          <FilamentSearchInput value={filament} onChange={setFilament} />
        </View>
      )}

      {/* Show rest of form once filament is selected or editing */}
      {(!!item || !!filament) && (
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={f.label}>Quantity (spools)</Text>
              <TextInput
                value={qty}
                onChangeText={setQty}
                keyboardType="decimal-pad"
                style={f.input}
                placeholderTextColor="rgba(255,255,255,0.2)"
                placeholder="1"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={f.label}>Target price ({sym})</Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                style={f.input}
                placeholderTextColor="rgba(255,255,255,0.2)"
                placeholder="Optional"
              />
            </View>
          </View>

          <View>
            <Text style={f.label}>Purchase URL</Text>
            <TextInput
              value={url}
              onChangeText={setUrl}
              style={f.input}
              placeholderTextColor="rgba(255,255,255,0.2)"
              placeholder="https://…"
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          <View>
            <Text style={f.label}>Priority</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([1, 0, -1] as const).map((p) => {
                const { label, color } = PRIORITY_LABEL[p];
                const active = priority === p;
                return (
                  <Pressable
                    key={p}
                    onPress={() => setPriority(p)}
                    style={[f.priorityBtn, active && { borderColor: color, backgroundColor: `${color}20` }]}
                  >
                    <Text style={[f.priorityText, active && { color }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <Text style={f.label}>Notes</Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              style={[f.input, { minHeight: 72, textAlignVertical: 'top', paddingTop: 12 }]}
              placeholderTextColor="rgba(255,255,255,0.2)"
              placeholder="Optional"
              multiline
            />
          </View>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
        <Pressable style={f.cancelBtn} onPress={onDone}>
          <Text style={f.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[f.saveBtn, !canSave && { opacity: 0.4 }]}
          onPress={() => { if (!canSave) return; setError(''); save.mutate(); }}
          disabled={save.isPending}
        >
          <Text style={f.saveText}>
            {save.isPending ? 'Saving…' : item ? 'Save changes' : 'Add to wishlist'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function WishlistRow({
  item, sym, onEdit, onDelete,
}: { item: WishlistItem; sym: string; onEdit: () => void; onDelete: () => void }) {
  const f = item.filament;
  const prio = PRIORITY_LABEL[item.priority] ?? PRIORITY_LABEL[0];

  return (
    <Pressable style={r.card} onPress={onEdit}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        {f?.image_url ? (
          <Image source={{ uri: f.image_url }} style={r.thumb} resizeMode="cover" />
        ) : (
          <View style={[r.thumb, { backgroundColor: f?.color_hex ?? '#808080' }]} />
        )}

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={r.title} numberOfLines={1}>{f?.title ?? '—'}</Text>
          <Text style={r.sub}>{f?.brand?.name} · {f?.material_type}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 }}>
            <Text style={r.meta}>{item.quantity_spools}× spool</Text>
            {item.desired_price != null && (
              <Text style={r.meta}>{sym}{item.desired_price}</Text>
            )}
            <Text style={[r.meta, { color: prio.color }]}>{prio.label}</Text>
          </View>
        </View>

        <Pressable onPress={onDelete} hitSlop={12}>
          <Ionicons name="trash-outline" size={18} color={colors.vibrantOrange} />
        </Pressable>
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WishlistScreen() {
  const qc = useQueryClient();
  const { sym } = useCurrency();
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<WishlistItem | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.wishlist.list(),
  });

  const deleteItem = useMutation({
    mutationFn: (id: number) => api.wishlist.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wishlist'] }),
  });

  const totalBudget = items.reduce((s, i) => s + (i.desired_price ?? 0) * i.quantity_spools, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.deepPurple }} edges={['top']}>
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id_wish)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        ListHeaderComponent={
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 16 }}>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 20 }}>Wishlist</Text>
            </View>
            {items.length > 0 && (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                <StatCard label="Items" value={items.length} accentColor={colors.lightBlue} />
                <StatCard label="Spools" value={items.reduce((s, i) => s + i.quantity_spools, 0)} accentColor={colors.vibrantGreen} />
                <StatCard
                  label="Budget"
                  value={totalBudget > 0 ? `${sym}${totalBudget.toFixed(0)}` : '—'}
                  accentColor={colors.vibrantOrange}
                />
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <WishlistRow
            item={item}
            sym={sym}
            onEdit={() => setEditItem(item)}
            onDelete={() =>
              Alert.alert('Remove', 'Remove from wishlist?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => deleteItem.mutate(item.id_wish) },
              ])
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ alignItems: 'center', paddingTop: 64 }}>
              <ActivityIndicator color={colors.lightBlue} />
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingTop: 64 }}>
              <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Your wishlist is empty.</Text>
            </View>
          )
        }
      />

      {/* FAB */}
      <Pressable
        style={{ position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, backgroundColor: colors.vibrantOrange, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6 }}
        onPress={() => setAddOpen(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      <Sheet visible={addOpen} title="Add to wishlist" onClose={() => setAddOpen(false)}>
        <WishlistForm onDone={() => setAddOpen(false)} />
      </Sheet>
      <Sheet visible={!!editItem} title="Edit wishlist item" onClose={() => setEditItem(null)}>
        {editItem && <WishlistForm item={editItem} onDone={() => setEditItem(null)} />}
      </Sheet>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const f = StyleSheet.create({
  label:       { color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  input:       { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 14 },
  errBox:      { backgroundColor: 'rgba(231,64,17,0.10)', borderWidth: 1, borderColor: 'rgba(231,64,17,0.25)', borderRadius: 10, padding: 12 },
  errText:     { color: colors.vibrantOrange, fontSize: 13 },
  priorityBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center' },
  priorityText:{ color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  cancelBtn:   { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center' },
  cancelText:  { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  saveBtn:     { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.vibrantOrange, alignItems: 'center' },
  saveText:    { color: '#fff', fontWeight: '600', fontSize: 14 },
});

const r = StyleSheet.create({
  card:  { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 20, padding: 16 },
  thumb: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  title: { color: 'rgba(255,255,255,0.9)', fontWeight: '500', fontSize: 14 },
  sub:   { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 },
  meta:  { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
});
