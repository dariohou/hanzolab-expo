import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTimer } from '@hanzolab/timer-core';
import { Button, Card } from '@hanzolab/ui';
import { formatTime } from '@hanzolab/utils';

const MOCK_EXERCISE = {
  id: '1',
  name: 'Push-ups',
  description: 'Classic push-ups for chest and triceps',
  muscleGroups: ['chest', 'triceps', 'shoulders'],
  difficulty: 'beginner',
  defaultReps: 10,
  defaultSets: 5,
  instructions: [
    'Keep your body straight',
    'Lower until chest nearly touches floor',
    'Push back up',
  ],
};

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams();
  const timer = useTimer({ duration: 30, restDuration: 60, intervals: 5 });

  return (
    <View className="flex-1 px-6 py-8">
      <Text className="text-3xl font-bold text-white mb-2">{MOCK_EXERCISE.name}</Text>
      <Text className="text-gray-400 mb-6">{MOCK_EXERCISE.description}</Text>

      <Card className="items-center mb-8">
        <Text className="text-6xl font-bold text-white mb-4">
          {formatTime(timer.remainingSeconds.value)}
        </Text>
        <Text className="text-gray-400 mb-2">
          Interval {timer.currentInterval.value} of {5}
        </Text>

        <View className="flex-row mt-4">
          {!timer.isRunning.value ? (
            <Button title="Start" onPress={timer.start} className="mr-4" />
          ) : (
            <Button title="Pause" onPress={timer.pause} variant="secondary" className="mr-4" />
          )}
          <Button title="Reset" onPress={timer.reset} variant="outline" />
        </View>
      </Card>

      <Text className="text-xl text-white font-semibold mb-4">Instructions</Text>
      {MOCK_EXERCISE.instructions.map((instruction, index) => (
        <Text key={index} className="text-gray-400 mb-2">
          {index + 1}. {instruction}
        </Text>
      ))}

      <View className="mt-8">
        <Text className="text-gray-400">
          Target: {MOCK_EXERCISE.defaultSets} sets of {MOCK_EXERCISE.defaultReps} reps
        </Text>
      </View>
    </View>
  );
}
