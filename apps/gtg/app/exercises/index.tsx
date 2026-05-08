import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { Card } from '@hanzolab/ui';
import { state$ } from '@hanzolab/state';
import { useValue } from '@legendapp/state/react';

const MOCK_EXERCISES = [
  {
    id: '1',
    name: 'Push-ups',
    muscleGroups: ['chest', 'triceps'],
    difficulty: 'beginner',
    defaultReps: 10,
    defaultSets: 5,
  },
  {
    id: '2',
    name: 'Pull-ups',
    muscleGroups: ['back', 'biceps'],
    difficulty: 'intermediate',
    defaultReps: 5,
    defaultSets: 5,
  },
  {
    id: '3',
    name: 'Squats',
    muscleGroups: ['quadriceps', 'glutes'],
    difficulty: 'beginner',
    defaultReps: 15,
    defaultSets: 5,
  },
  {
    id: '4',
    name: 'Dips',
    muscleGroups: ['chest', 'triceps'],
    difficulty: 'intermediate',
    defaultReps: 10,
    defaultSets: 5,
  },
  {
    id: '5',
    name: 'Lunges',
    muscleGroups: ['quadriceps', 'glutes'],
    difficulty: 'beginner',
    defaultReps: 12,
    defaultSets: 3,
  },
];

export default function ExercisesIndex() {
  const exercises = useValue(state$.exercises);
  const displayExercises = exercises.length > 0 ? exercises : MOCK_EXERCISES;

  return (
    <View className="flex-1 px-6 py-8">
      <Text className="text-3xl font-bold text-white mb-6">Exercises</Text>

      <FlatList
        data={displayExercises}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Link href={`/exercises/${item.id}`} className="mb-4">
            <Card>
              <Text className="text-xl text-white font-semibold">{item.name}</Text>
              <View className="flex-row mt-2">
                <Text className="text-gray-400 text-sm">{item.muscleGroups.join(', ')}</Text>
              </View>
              <View className="flex-row mt-2">
                <Text className="text-primary text-sm">
                  {item.defaultSets}x{item.defaultReps}
                </Text>
                <Text className="text-gray-500 text-sm ml-4">{item.difficulty}</Text>
              </View>
            </Card>
          </Link>
        )}
      />
    </View>
  );
}
