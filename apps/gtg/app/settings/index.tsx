import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '@hanzolab/auth';
import { Card } from '@hanzolab/ui';

export default function SettingsIndex() {
  const { user, signOut } = useAuth();

  return (
    <View className="flex-1 px-6 py-8">
      <Text className="text-3xl font-bold text-white mb-6">Settings</Text>

      <Card className="mb-4">
        <Text className="text-gray-400 text-sm">Email</Text>
        <Text className="text-white text-lg">{user?.email ?? 'Not signed in'}</Text>
      </Card>

      <Card className="mb-4">
        <Text className="text-white font-semibold mb-2">Notifications</Text>
        <TouchableOpacity className="flex-row justify-between items-center">
          <Text className="text-gray-400">Workout reminders</Text>
          <Text className="text-primary">Enabled</Text>
        </TouchableOpacity>
      </Card>

      <Card className="mb-4">
        <Text className="text-white font-semibold mb-2">About</Text>
        <Text className="text-gray-400">Version 1.0.0</Text>
      </Card>

      <View className="mt-auto">
        <TouchableOpacity onPress={() => signOut()} className="px-4 py-3 bg-error rounded-lg">
          <Text className="text-white font-semibold text-center">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
