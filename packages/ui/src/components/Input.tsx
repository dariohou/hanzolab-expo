import { TextInput, type TextInputProps, View, Text } from 'react-native';
import { colors } from '../theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: Props) {
  return (
    <View style={{ marginBottom: 16 }}>
      {label && <Text style={{ color: colors.foreground, marginBottom: 4 }}>{label}</Text>}
      <TextInput
        {...props}
        style={[
          {
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: error ? colors.error : colors.border,
            borderRadius: 8,
            padding: 12,
            color: colors.foreground,
          },
          style,
        ]}
        placeholderTextColor={colors.muted}
      />
      {error && <Text style={{ color: colors.error, marginTop: 4 }}>{error}</Text>}
    </View>
  );
}
