import { View, type ViewProps } from 'react-native';
import { colors } from '../theme';

interface Props extends ViewProps {
  variant?: 'default' | 'outlined';
}

export function Card({ children, variant = 'default', style, ...props }: Props) {
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: colors.background,
          borderRadius: 12,
          padding: 16,
          borderWidth: variant === 'outlined' ? 1 : 0,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
