import { useRef } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import { colors } from '../theme';

interface Props {
  value: number;
  max: number;
  onChange: (v: number) => void;
}

export default function WeightSlider({ value, max, onChange }: Props) {
  const trackRef = useRef<View>(null);
  const trackX = useRef(0);
  const trackW = useRef(0);
  const onChangeRef = useRef(onChange);
  const maxRef = useRef(max);
  onChangeRef.current = onChange;
  maxRef.current = max;

  const pct = maxRef.current > 0 ? Math.max(0, Math.min(1, value / maxRef.current)) : 0;

  const measure = (cb: () => void) => {
    trackRef.current?.measureInWindow((x, _y, w) => {
      trackX.current = x;
      trackW.current = w;
      cb();
    });
  };

  const applyX = (pageX: number) => {
    const w = trackW.current;
    if (w <= 0) return;
    const p = Math.max(0, Math.min(1, (pageX - trackX.current) / w));
    onChangeRef.current(Math.round(p * maxRef.current));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        measure(() => applyX(evt.nativeEvent.pageX));
      },
      onPanResponderMove: (evt) => {
        applyX(evt.nativeEvent.pageX);
      },
    }),
  ).current;

  return (
    <View
      ref={trackRef}
      style={s.track}
      {...panResponder.panHandlers}
    >
      {/* Filled */}
      <View style={[s.fill, { width: `${pct * 100}%` }]} />
      {/* Thumb */}
      <View style={[s.thumb, { left: `${pct * 100}%` }]} />
    </View>
  );
}

const s = StyleSheet.create({
  track: {
    height: 28,
    justifyContent: 'center',
    position: 'relative',
  },
  fill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.lightBlue,
    position: 'absolute',
    left: 0,
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    position: 'absolute',
    marginLeft: -11,
    top: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
});
