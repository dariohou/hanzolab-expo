import type { ButtonProps } from 'react-native';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { colors } from '../theme';

interface Props extends ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  ...props
}: Props) {
  const bgColor =
    variant === 'primary'
      ? colors.primary
      : variant === 'secondary'
        ? colors.secondary
        : 'transparent';
  const textColor = variant === 'outline' ? colors.primary : colors.foreground;
  const padding = size === 'sm' ? 8 : size === 'lg' ? 16 : 12;

  return (
    <TouchableOpacity
      {...props}
      disabled={disabled || loading}
      style={{
        backgroundColor: bgColor,
        paddingVertical: padding,
        paddingHorizontal: padding * 2,
        borderRadius: 8,
        borderWidth: variant === 'outline' ? 1 : 0,
        borderColor: colors.primary,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={{ color: textColor, fontWeight: '600', textAlign: 'center' }}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
