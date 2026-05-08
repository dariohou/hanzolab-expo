import { View, Text } from 'react-native';
import { Link } from 'expo-router';
import { Input, Button } from '@hanzolab/ui';

export default function Login() {
  return (
    <View className="flex-1 px-6 py-8 justify-center">
      <Text className="text-3xl font-bold text-white mb-8 text-center">Sign In</Text>

      <Input
        label="Email"
        placeholder="your@email.com"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Input label="Password" placeholder="Enter password" secureTextEntry />

      <Button title="Sign In" className="mt-4" />

      <View className="mt-6 text-center">
        <Text className="text-gray-400">
          Don't have an account?{' '}
          <Link href="/auth/signup">
            <Text className="text-primary">Sign Up</Text>
          </Link>
        </Text>
      </View>
    </View>
  );
}
