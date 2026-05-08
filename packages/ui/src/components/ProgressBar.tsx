import { View, type ViewProps } from 'react-native';
import { colors } from '../theme';

interface Props extends ViewProps {
  progress: number;
  height?: number;
}

export function ProgressBar({ progress, height = 8, style, ...props }: Props) {
  return (
    <View
      {...props}
      style={[
        { backgroundColor: colors.border, borderRadius: height / 2, overflow: 'hidden', height },
        style,
      ]}
    >
      <View
        style={{
          backgroundColor: colors.primary,
          height: '100%',
          width: `${Math.min(100, Math.max(0, progress * 100))}%`,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}
