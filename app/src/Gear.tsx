import { View } from 'react-native';

/** A settings gear drawn with plain views (no icon package): 8 teeth around a ring with a hole. */
export default function Gear({ size = 24, color = '#8e8e93', bg = 'transparent' }: { size?: number; color?: string; bg?: string }) {
  const ring = size * 0.68;
  const tooth = { w: size * 0.2, h: size * 0.96 };
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {[0, 45, 90, 135].map((deg) => (
        <View key={deg} style={{ position: 'absolute', width: tooth.w, height: tooth.h, borderRadius: size * 0.04, backgroundColor: color, transform: [{ rotate: `${deg}deg` }] }} />
      ))}
      <View style={{ width: ring, height: ring, borderRadius: ring / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: size * 0.3, height: size * 0.3, borderRadius: size * 0.15, backgroundColor: bg }} />
      </View>
    </View>
  );
}
