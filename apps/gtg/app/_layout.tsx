import { Stack } from 'expo-router';
import { NativeWindStyleProvider } from '@hanzolab/ui';
import { AuthProvider } from '@hanzolab/auth';
import { View } from 'react-native';

export default function RootLayout() {
  return (
    <NativeWindStyleProvider>
      <AuthProvider appId="gtg">
        <View className="flex-1 bg-background">
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#1a1a1a' },
            }}
          />
        </View>
      </AuthProvider>
    </NativeWindStyleProvider>
  );
}
