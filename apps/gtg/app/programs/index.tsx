import { View, Text, FlatList } from 'react-native';
import { Card } from '@hanzolab/ui';

const MOCK_PROGRAMS = [
  {
    id: '1',
    name: 'Beginner Strength',
    description: 'Build foundational strength with basic exercises',
    difficulty: 'beginner',
    exerciseCount: 5,
  },
  {
    id: '2',
    name: 'Greasing the Groove',
    description: 'High frequency, low volume training',
    difficulty: 'intermediate',
    exerciseCount: 4,
  },
];

export default function ProgramsIndex() {
  return (
    <View className="flex-1 px-6 py-8">
      <Text className="text-3xl font-bold text-white mb-6">Programs</Text>

      <FlatList
        data={MOCK_PROGRAMS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card className="mb-4">
            <Text className="text-xl text-white font-semibold">{item.name}</Text>
            <Text className="text-gray-400 mt-2">{item.description}</Text>
            <View className="flex-row mt-3">
              <Text className="text-primary text-sm">{item.exerciseCount} exercises</Text>
              <Text className="text-gray-500 text-sm ml-4">{item.difficulty}</Text>
            </View>
          </Card>
        )}
      />
    </View>
  );
}
