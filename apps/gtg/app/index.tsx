import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { useAuth, useIsAuthenticated } from '@hanzolab/auth';
import { Card } from '@hanzolab/ui';

function AuthScreen() {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Text className="text-4xl font-bold text-white mb-4">GTG</Text>
      <Text className="text-gray-400 text-center mb-8">
        Greasing the Groove - Get stronger using this technique
      </Text>
      <Link href="/auth/login" className="px-6 py-3 bg-primary rounded-lg mb-4">
        <Text className="text-white font-semibold">Sign In</Text>
      </Link>
      <Link href="/auth/signup" className="px-6 py-3 bg-secondary rounded-lg">
        <Text className="text-white font-semibold">Sign Up</Text>
      </Link>
    </View>
  );
}

function HomeScreen() {
  const { user, signOut } = useAuth();

  return (
    <View className="flex-1 px-6 py-8">
      <View className="mb-8">
        <Text className="text-3xl font-bold text-white mb-2">GTG</Text>
        <Text className="text-gray-400">Welcome back</Text>
      </View>

      <TouchableOpacity className="mb-4">
        <Link href="/exercises">
          <Card>
            <Text className="text-xl text-white font-semibold mb-2">Exercises</Text>
            <Text className="text-gray-400">View and manage your exercises</Text>
          </Card>
        </Link>
      </TouchableOpacity>

      <TouchableOpacity className="mb-4">
        <Link href="/programs">
          <Card>
            <Text className="text-xl text-white font-semibold mb-2">Programs</Text>
            <Text className="text-gray-400">Browse workout programs</Text>
          </Card>
        </Link>
      </TouchableOpacity>

      <TouchableOpacity className="mb-4">
        <Link href="/settings">
          <Card>
            <Text className="text-xl text-white font-semibold mb-2">Settings</Text>
            <Text className="text-gray-400">App settings and preferences</Text>
          </Card>
        </Link>
      </TouchableOpacity>

      <View className="mt-auto">
        <TouchableOpacity onPress={() => signOut()} className="px-4 py-2 bg-error rounded-lg">
          <Text className="text-white font-semibold text-center">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function Index() {
  const { isAuthenticated, isLoading } = useIsAuthenticated();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-white">Loading...</Text>
      </View>
    );
  }

  return isAuthenticated ? <HomeScreen /> : <AuthScreen />;
}
