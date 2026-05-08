import { useState } from 'react';
import {
  View, Text, FlatList, Pressable, Alert, ActivityIndicator,
  Image, TextInput, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api, type Project, type Spool, type WishlistItem } from '../../src/api/client';
import Sheet from '../../src/components/Sheet';
import { colors } from '../../src/theme';

// ─── Project form (create / edit) ────────────────────────────────────────────

interface ProjectFormProps { project?: Project | null; onDone: () => void }

function ProjectForm({ project, onDone }: ProjectFormProps) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(project?.title ?? '');
  const [recipient, setRecipient] = useState(project?.target_person ?? '');
  const [modelUrl, setModelUrl] = useState(project?.model_url ?? '');
  const [notes, setNotes] = useState(project?.comment ?? '');
  const [tagIds, setTagIds] = useState<number[]>(project?.tags.map((t) => t.id_tag) ?? []);
  const [newTag, setNewTag] = useState('');
  const [error, setError] = useState('');

  const { data: tags = [] } = useQuery({ queryKey: ['tags'], queryFn: () => api.tags.list() });

  const createTag = useMutation({
    mutationFn: () => api.tags.create({ name: newTag.trim() }),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ['tags'] });
      setTagIds((p) => [...p, t.id_tag]);
      setNewTag('');
    },
  });

  const deleteTag = useMutation({
    mutationFn: (id: number) => api.tags.delete(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['tags'] });
      setTagIds((p) => p.filter((x) => x !== id));
    },
  });

  const toggleTag = (id: number) =>
    setTagIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const save = useMutation({
    mutationFn: () => {
      const body = {
        title, target_person: recipient || undefined,
        model_url: modelUrl || undefined,
        comment: notes || undefined,
        tag_ids: tagIds,
      };
      return project
        ? api.projects.update(project.id_project, body)
        : api.projects.create(body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); onDone(); },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <View style={{ gap: 16 }}>
      {!!error && (
        <View style={pf.errBox}><Text style={pf.errText}>{error}</Text></View>
      )}

      <View>
        <Text style={pf.label}>Title *</Text>
        <TextInput value={title} onChangeText={setTitle} style={pf.input}
          placeholderTextColor="rgba(255,255,255,0.2)" placeholder="Project name" />
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={pf.label}>For (recipient)</Text>
          <TextInput value={recipient} onChangeText={setRecipient} style={pf.input}
            placeholderTextColor="rgba(255,255,255,0.2)" placeholder="Optional" />
        </View>
      </View>

      <View>
        <Text style={pf.label}>Model URL</Text>
        <TextInput value={modelUrl} onChangeText={setModelUrl} style={pf.input}
          placeholderTextColor="rgba(255,255,255,0.2)" placeholder="Makerworld, Thingiverse…"
          autoCapitalize="none" keyboardType="url" />
      </View>

      <View>
        <Text style={pf.label}>Notes</Text>
        <TextInput value={notes} onChangeText={setNotes}
          style={[pf.input, { minHeight: 64, textAlignVertical: 'top', paddingTop: 12 }]}
          placeholderTextColor="rgba(255,255,255,0.2)" placeholder="Optional" multiline />
      </View>

      {/* Tags */}
      <View>
        <Text style={pf.label}>Tags</Text>
        {tags.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {tags.map((t) => {
              const active = tagIds.includes(t.id_tag);
              return (
                <View key={t.id_tag} style={{ flexDirection: 'row' }}>
                  <Pressable
                    onPress={() => toggleTag(t.id_tag)}
                    style={[
                      pf.tagBtn,
                      active
                        ? { borderColor: t.color ?? colors.lightBlue, backgroundColor: `${t.color ?? colors.lightBlue}20` }
                        : undefined,
                    ]}
                  >
                    <Text style={[pf.tagText, active && { color: t.color ?? colors.lightBlue }]}>
                      {t.name}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      Alert.alert(`Delete tag "${t.name}"?`, '', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteTag.mutate(t.id_tag) },
                      ])
                    }
                    style={pf.tagDel}
                  >
                    <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>×</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            value={newTag}
            onChangeText={setNewTag}
            style={[pf.input, { flex: 1 }]}
            placeholderTextColor="rgba(255,255,255,0.2)"
            placeholder="New tag…"
          />
          <Pressable
            onPress={() => newTag.trim() && createTag.mutate()}
            disabled={createTag.isPending || !newTag.trim()}
            style={pf.addTagBtn}
          >
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Add</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
        <Pressable style={pf.cancelBtn} onPress={onDone}>
          <Text style={pf.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[pf.saveBtn, !title.trim() && { opacity: 0.4 }]}
          onPress={() => { if (!title.trim()) return; setError(''); save.mutate(); }}
          disabled={save.isPending}
        >
          <Text style={pf.saveText}>
            {save.isPending ? 'Saving…' : project ? 'Save changes' : 'Create project'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Link filament sheet ──────────────────────────────────────────────────────

function LinkFilamentSheet({ project, onClose }: { project: Project; onClose: () => void }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'spool' | 'wish'>('spool');

  const { data: allProjects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => api.projects.list() });
  const live = allProjects.find((p) => p.id_project === project.id_project) ?? project;

  const { data: spools = [] } = useQuery({ queryKey: ['spools'], queryFn: () => api.spools.list() });
  const { data: wishlist = [] } = useQuery({ queryKey: ['wishlist'], queryFn: () => api.wishlist.list() });

  const linkedSpoolIds = new Set(live.filaments.map((f) => f.id_spool).filter(Boolean));
  const linkedWishIds  = new Set(live.filaments.map((f) => f.id_wish).filter(Boolean));

  const add = useMutation({
    mutationFn: (body: { id_spool?: number; id_wish?: number }) =>
      api.projects.addFilament(project.id_project, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });

  const remove = useMutation({
    mutationFn: (linkId: number) => api.projects.removeFilament(project.id_project, linkId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });

  const available = tab === 'spool'
    ? spools.filter((s) => !linkedSpoolIds.has(s.id_spool))
    : wishlist.filter((w) => !linkedWishIds.has(w.id_wish));

  return (
    <View style={{ gap: 16 }}>
      {/* Linked */}
      {live.filaments.length > 0 && (
        <View>
          <Text style={lf.sectionLabel}>Linked</Text>
          {live.filaments.map((link) => {
            const fil = link.spool?.filament ?? link.wish?.filament;
            return (
              <View key={link.id_link} style={lf.linkedRow}>
                {fil?.image_url ? (
                  <Image source={{ uri: fil.image_url }} style={lf.thumb} resizeMode="cover" />
                ) : (
                  <View style={[lf.thumb, { backgroundColor: fil?.color_hex ?? '#808080' }]} />
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={lf.rowTitle} numberOfLines={1}>{fil?.title ?? '—'}</Text>
                  <Text style={lf.rowSub}>
                    {link.spool ? `Spool · ${link.spool.weight_remaining_grams}g` : 'Wishlist'}
                  </Text>
                </View>
                <Pressable onPress={() => remove.mutate(link.id_link)} hitSlop={10}>
                  <Ionicons name="close-circle-outline" size={20} color={colors.vibrantOrange} />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {/* Tab */}
      <View style={lf.tabRow}>
        {(['spool', 'wish'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)}
            style={[lf.tab, tab === t && lf.tabActive]}>
            <Text style={[lf.tabText, tab === t && lf.tabTextActive]}>
              {t === 'spool' ? 'Owned spools' : 'Wishlist'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Available */}
      <ScrollView style={{ maxHeight: 260 }} scrollEnabled keyboardShouldPersistTaps="handled">
        {available.length === 0 ? (
          <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, textAlign: 'center', paddingVertical: 24 }}>
            {tab === 'spool' ? 'No unlinked spools' : 'No unlinked wishlist items'}
          </Text>
        ) : (
          available.map((item) => {
            const isSpool = 'id_spool' in item;
            const fil = (item as Spool).filament ?? (item as WishlistItem).filament;
            return (
              <Pressable
                key={isSpool ? (item as Spool).id_spool : (item as WishlistItem).id_wish}
                style={lf.availRow}
                onPress={() => add.mutate(
                  isSpool
                    ? { id_spool: (item as Spool).id_spool }
                    : { id_wish: (item as WishlistItem).id_wish },
                )}
              >
                {fil?.image_url ? (
                  <Image source={{ uri: fil.image_url }} style={lf.smallThumb} resizeMode="cover" />
                ) : (
                  <View style={[lf.smallThumb, { backgroundColor: fil?.color_hex ?? '#808080' }]} />
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={lf.rowTitle} numberOfLines={1}>{fil?.title ?? '—'}</Text>
                  <Text style={lf.rowSub}>
                    {fil?.brand?.name} · {fil?.material_type}
                    {isSpool ? ` · ${(item as Spool).weight_remaining_grams}g` : ''}
                  </Text>
                </View>
                <Text style={{ color: colors.vibrantGreen, fontSize: 12 }}>+ Add</Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Pressable style={lf.doneBtn} onPress={onClose}>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Done</Text>
      </Pressable>
    </View>
  );
}

// ─── Project row ──────────────────────────────────────────────────────────────

function ProjectRow({
  project, onEdit, onDelete, onLinkFilament,
}: { project: Project; onEdit: () => void; onDelete: () => void; onLinkFilament: () => void }) {
  const totalWeight = project.filaments.reduce((s, f) => s + (f.spool?.weight_remaining_grams ?? 0), 0);

  return (
    <View style={pr.card}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={pr.title} numberOfLines={1}>{project.title}</Text>
          {project.target_person && (
            <Text style={pr.sub}>For {project.target_person}</Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable onPress={onEdit} hitSlop={10}>
            <Text style={pr.editBtn}>Edit</Text>
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={10}>
            <Ionicons name="trash-outline" size={16} color="rgba(255,255,255,0.25)" />
          </Pressable>
        </View>
      </View>

      {/* Tags */}
      {project.tags.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {project.tags.map((t) => (
            <View key={t.id_tag} style={[pr.tag, t.color ? { borderColor: `${t.color}50`, backgroundColor: `${t.color}20` } : undefined]}>
              <Text style={[pr.tagText, t.color ? { color: t.color } : undefined]}>{t.name}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Filament chips */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 10 }}>
        {project.filaments.map((link) => {
          const fil = link.spool?.filament ?? link.wish?.filament;
          return fil?.image_url ? (
            <Image key={link.id_link} source={{ uri: fil.image_url }} style={pr.filChip} resizeMode="cover" />
          ) : (
            <View key={link.id_link} style={[pr.filChip, { backgroundColor: fil?.color_hex ?? '#808080' }]} />
          );
        })}
        <Pressable onPress={onLinkFilament} style={pr.addFilBtn}>
          <Text style={pr.addFilText}>+ filament</Text>
        </Pressable>
      </View>

      {/* Footer */}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
        {totalWeight > 0 && (
          <Text style={{ color: colors.vibrantGreen, fontSize: 12, fontWeight: '500' }}>
            {totalWeight.toFixed(0)}g total
          </Text>
        )}
        {project.comment ? (
          <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }} numberOfLines={1}>
            {project.comment}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProjectsScreen() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [linkProject, setLinkProject] = useState<Project | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.projects.list(),
  });

  const deleteProject = useMutation({
    mutationFn: (id: number) => api.projects.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.deepPurple }} edges={['top']}>
      <FlatList
        data={projects}
        keyExtractor={(p) => String(p.id_project)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        ListHeaderComponent={
          <View style={{ paddingTop: 8, paddingBottom: 16 }}>
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 20 }}>Projects</Text>
            <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 }}>
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ProjectRow
            project={item}
            onEdit={() => setEditProject(item)}
            onDelete={() =>
              Alert.alert('Delete project', `Delete "${item.title}"?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteProject.mutate(item.id_project) },
              ])
            }
            onLinkFilament={() => setLinkProject(item)}
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
              <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No projects yet.</Text>
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

      <Sheet visible={addOpen} title="New project" onClose={() => setAddOpen(false)}>
        <ProjectForm onDone={() => setAddOpen(false)} />
      </Sheet>
      <Sheet visible={!!editProject} title="Edit project" onClose={() => setEditProject(null)}>
        {editProject && <ProjectForm project={editProject} onDone={() => setEditProject(null)} />}
      </Sheet>
      <Sheet
        visible={!!linkProject}
        title={`Link filament${linkProject ? ` — ${linkProject.title}` : ''}`}
        onClose={() => setLinkProject(null)}
      >
        {linkProject && <LinkFilamentSheet project={linkProject} onClose={() => setLinkProject(null)} />}
      </Sheet>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const pf = StyleSheet.create({
  label:     { color: 'rgba(255,255,255,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  input:     { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 14 },
  errBox:    { backgroundColor: 'rgba(231,64,17,0.10)', borderWidth: 1, borderColor: 'rgba(231,64,17,0.25)', borderRadius: 10, padding: 12 },
  errText:   { color: colors.vibrantOrange, fontSize: 13 },
  tagBtn:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  tagText:   { color: 'rgba(255,255,255,0.45)', fontSize: 12 },
  tagDel:    { paddingHorizontal: 8, paddingVertical: 6, borderTopRightRadius: 20, borderBottomRightRadius: 20, borderWidth: 1, borderLeftWidth: 0, borderColor: 'rgba(255,255,255,0.15)', justifyContent: 'center' },
  addTagBtn: { paddingHorizontal: 16, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center' },
  cancelText:{ color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  saveBtn:   { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.vibrantOrange, alignItems: 'center' },
  saveText:  { color: '#fff', fontWeight: '600', fontSize: 14 },
});

const pr = StyleSheet.create({
  card:      { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 20, padding: 16 },
  title:     { color: 'rgba(255,255,255,0.9)', fontWeight: '500', fontSize: 15 },
  sub:       { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 },
  editBtn:   { color: 'rgba(255,255,255,0.35)', fontSize: 13 },
  tag:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  tagText:   { color: 'rgba(255,255,255,0.45)', fontSize: 11 },
  filChip:   { width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  addFilBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(7,180,185,0.3)', backgroundColor: 'rgba(7,180,185,0.08)' },
  addFilText:{ color: colors.lightBlue, fontSize: 11 },
});

const lf = StyleSheet.create({
  sectionLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  linkedRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  availRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  thumb:      { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  smallThumb: { width: 32, height: 32, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  rowTitle:   { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  rowSub:     { color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 1 },
  tabRow:     { flexDirection: 'row', gap: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', paddingBottom: 8 },
  tab:        { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  tabActive:  { backgroundColor: 'rgba(255,255,255,0.10)' },
  tabText:    { color: 'rgba(255,255,255,0.35)', fontSize: 13 },
  tabTextActive: { color: '#fff' },
  doneBtn:    { paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', marginTop: 4 },
});
