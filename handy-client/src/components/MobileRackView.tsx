import { useRef, useState, useCallback } from 'react';
import {
  View, Text, Image, ScrollView, PanResponder, Animated, StyleSheet,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Spool, type Rack } from '../api/client';
import { colors } from '../theme';

interface Props {
  spools: Spool[];
  racks: Rack[];
  onPress: (spool: Spool) => void;
  header?: React.ReactNode;
}

// ─── Chip thumbnail ───────────────────────────────────────────────────────────

function ChipContent({ spool }: { spool: Spool }) {
  const f = spool.filament;
  return f?.image_url ? (
    <Image
      source={{ uri: f.image_url }}
      style={{ width: '100%', height: '100%' }}
      resizeMode="cover"
    />
  ) : (
    <View style={{ flex: 1, backgroundColor: f?.color_hex ?? '#808080' }}>
      <View style={ss.dot} />
    </View>
  );
}

// ─── Draggable chip ───────────────────────────────────────────────────────────

interface ChipProps {
  spool: Spool;
  active: boolean;
  onTap: () => void;
  onDragStart: (spool: Spool, pageX: number, pageY: number) => void;
  onDragMove: (pageX: number, pageY: number) => void;
  onDragEnd: () => void;
}

function DraggableChip({ spool, active, onTap, onDragStart, onDragMove, onDragEnd }: ChipProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragging = useRef(false);

  // callbacks forwarded via refs so PanResponder (created once) always sees latest
  const onDragStartRef = useRef(onDragStart);
  const onDragMoveRef  = useRef(onDragMove);
  const onDragEndRef   = useRef(onDragEnd);
  const onTapRef       = useRef(onTap);
  onDragStartRef.current = onDragStart;
  onDragMoveRef.current  = onDragMove;
  onDragEndRef.current   = onDragEnd;
  onTapRef.current       = onTap;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => dragging.current,

      onPanResponderGrant: (e) => {
        const { pageX, pageY } = e.nativeEvent;
        longPressTimer.current = setTimeout(() => {
          dragging.current = true;
          onDragStartRef.current(spool, pageX, pageY);
        }, 400);
      },

      onPanResponderMove: (e) => {
        if (!dragging.current) return;
        onDragMoveRef.current(e.nativeEvent.pageX, e.nativeEvent.pageY);
      },

      onPanResponderRelease: () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        if (dragging.current) {
          dragging.current = false;
          onDragEndRef.current();
        } else {
          onTapRef.current();
        }
      },

      onPanResponderTerminate: () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        if (dragging.current) {
          dragging.current = false;
          onDragEndRef.current();
        }
      },
    }),
  ).current;

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        ss.chip,
        { borderColor: active ? colors.lightBlue : 'rgba(255,255,255,0.15)', opacity: active ? 0.35 : 1 },
      ]}
    >
      <ChipContent spool={spool} />
    </View>
  );
}

// ─── Rack section ─────────────────────────────────────────────────────────────

interface SectionProps {
  id: number | 'unassigned';
  name: string;
  spools: Spool[];
  maxCapacity?: number;
  dashed?: boolean;
  hovered: boolean;
  activeSpool: Spool | null;
  onTap: (s: Spool) => void;
  onDragStart: (s: Spool, x: number, y: number) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: () => void;
  onRegisterRef: (id: number | 'unassigned', ref: View | null) => void;
}

function RackSection({
  id, name, spools, maxCapacity, dashed, hovered,
  activeSpool, onTap, onDragStart, onDragMove, onDragEnd, onRegisterRef,
}: SectionProps) {
  const emptySlots = maxCapacity ? Math.max(0, maxCapacity - spools.length) : 0;

  return (
    <View style={{ marginBottom: 24 }}>
      <View style={ss.sectionHeader}>
        <Text style={ss.sectionName}>{name}</Text>
        {maxCapacity != null && (
          <Text style={ss.sectionCount}>{spools.length} / {maxCapacity}</Text>
        )}
        <View style={ss.divider} />
        {hovered && <Text style={ss.dropHere}>Drop here</Text>}
      </View>

      <View
        ref={(r) => onRegisterRef(id, r)}
        style={[
          ss.zone,
          dashed && ss.zoneDashed,
          hovered && ss.zoneHovered,
        ]}
      >
        {spools.map((s) => (
          <DraggableChip
            key={s.id_spool}
            spool={s}
            active={activeSpool?.id_spool === s.id_spool}
            onTap={() => onTap(s)}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
          />
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <View key={`e-${i}`} style={ss.emptySlot} />
        ))}
        {spools.length === 0 && !maxCapacity && (
          <Text style={ss.emptyLabel}>{hovered ? 'Drop here' : 'Empty'}</Text>
        )}
      </View>
    </View>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function MobileRackView({ spools, racks, onPress, header }: Props) {
  const qc = useQueryClient();
  const [activeSpool, setActiveSpool] = useState<Spool | null>(null);
  const [hoveredId, setHoveredId] = useState<number | 'unassigned' | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<View>(null);
  const containerOrigin = useRef({ x: 0, y: 0 });
  // Store section drop-zone View refs so we can re-measure on every drag start
  const sectionRefs = useRef<Map<number | 'unassigned', View | null>>(new Map());
  const sectionBounds = useRef<Map<number | 'unassigned', { y: number; h: number }>>(new Map());
  const ghostAnim = useRef(new Animated.ValueXY()).current;
  const hoveredIdRef = useRef<number | 'unassigned' | null>(null);
  const activeSpoolRef = useRef<Spool | null>(null);

  const registerRef = useCallback((id: number | 'unassigned', ref: View | null) => {
    sectionRefs.current.set(id, ref);
  }, []);

  const measureAllSections = useCallback(() => {
    sectionRefs.current.forEach((ref, id) => {
      ref?.measureInWindow((_x, y, _w, h) => {
        if (h > 0) sectionBounds.current.set(id, { y, h });
      });
    });
  }, []);

  const moveToRack = useMutation({
    mutationFn: ({ spoolId, rackId }: { spoolId: number; rackId: number | null }) =>
      api.spools.assignRack(spoolId, rackId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spools'] }),
  });

  const handleDragStart = useCallback((spool: Spool, pageX: number, pageY: number) => {
    containerRef.current?.measureInWindow((cx, cy) => {
      containerOrigin.current = { x: cx, y: cy };
      // Re-measure section positions NOW (accounts for any scrolling that happened)
      measureAllSections();
      ghostAnim.setValue({ x: pageX - cx - 28, y: pageY - cy - 28 });
      activeSpoolRef.current = spool;
      setActiveSpool(spool);
      setIsDragging(true);
    });
  }, [ghostAnim, measureAllSections]);

  const handleDragMove = useCallback((pageX: number, pageY: number) => {
    ghostAnim.setValue({
      x: pageX - containerOrigin.current.x - 28,
      y: pageY - containerOrigin.current.y - 28,
    });
    let found: number | 'unassigned' | null = null;
    sectionBounds.current.forEach((b, id) => {
      if (pageY >= b.y && pageY <= b.y + b.h) found = id;
    });
    if (found !== hoveredIdRef.current) {
      hoveredIdRef.current = found;
      setHoveredId(found);
    }
  }, [ghostAnim]);

  const handleDragEnd = useCallback(() => {
    const spool = activeSpoolRef.current;
    const hovered = hoveredIdRef.current;
    if (spool && hovered !== null) {
      const targetRackId = hovered === 'unassigned' ? null : hovered;
      if (targetRackId !== (spool.id_rack ?? null)) {
        moveToRack.mutate({ spoolId: spool.id_spool, rackId: targetRackId });
      }
    }
    activeSpoolRef.current = null;
    hoveredIdRef.current = null;
    setActiveSpool(null);
    setHoveredId(null);
    setIsDragging(false);
  }, [moveToRack]);

  const byRack = (id: number | null) => spools.filter((s) => (s.id_rack ?? null) === id);

  const sharedProps = {
    activeSpool,
    onTap: onPress,
    onDragStart: handleDragStart,
    onDragMove: handleDragMove,
    onDragEnd: handleDragEnd,
    onRegisterRef: registerRef,
  };

  return (
    <View
      ref={containerRef}
      style={{ flex: 1 }}
      onLayout={() =>
        containerRef.current?.measureInWindow((x, y) => {
          containerOrigin.current = { x, y };
        })
      }
    >
      <ScrollView
        scrollEnabled={!isDragging}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
      >
        {header}
        {racks.map((rack) => (
          <RackSection
            key={rack.id_rack}
            id={rack.id_rack}
            name={rack.name}
            spools={byRack(rack.id_rack)}
            maxCapacity={rack.max_capacity}
            hovered={hoveredId === rack.id_rack}
            {...sharedProps}
          />
        ))}
        <RackSection
          id="unassigned"
          name="Unassigned"
          spools={byRack(null)}
          dashed
          hovered={hoveredId === 'unassigned'}
          {...sharedProps}
        />
      </ScrollView>

      {isDragging && activeSpool && (
        <Animated.View
          pointerEvents="none"
          style={[ss.ghost, { left: ghostAnim.x, top: ghostAnim.y }]}
        >
          <ChipContent spool={activeSpool} />
        </Animated.View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  chip: {
    width: 56, height: 56, borderRadius: 12, overflow: 'hidden', borderWidth: 2,
  },
  dot: {
    position: 'absolute', bottom: 4, right: 4, width: 8, height: 8,
    borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.25)',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionName:  { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '500' },
  sectionCount: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
  divider:      { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dropHere:     { color: colors.lightBlue, fontSize: 11, fontWeight: '600' },
  zone: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12,
    borderRadius: 12, minHeight: 72, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)',
  },
  zoneDashed:  { borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'transparent' },
  zoneHovered: { borderColor: colors.lightBlue, backgroundColor: 'rgba(7,180,185,0.08)' },
  emptySlot: {
    width: 56, height: 56, borderRadius: 12, borderWidth: 1,
    borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.08)',
  },
  emptyLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 12, alignSelf: 'center', paddingHorizontal: 4 },
  ghost: {
    position: 'absolute', width: 56, height: 56, borderRadius: 12,
    overflow: 'hidden', borderWidth: 2, borderColor: colors.lightBlue,
    opacity: 0.9, zIndex: 999,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 10, elevation: 12,
  },
});
