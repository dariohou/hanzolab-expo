import { useEffect, useRef, useCallback } from 'react';
import { runOnJS, useSharedValue, useAnimatedReaction, runOnUI } from 'react-native-reanimated';
import type { TimerConfig, TimerState } from './types';

const TICK_INTERVAL = 1000;

export function useTimer(config: TimerConfig) {
  const {
    duration,
    restDuration = 0,
    intervals = 1,
    autoStart = false,
    soundEnabled = true,
  } = config;

  const isRunning = useSharedValue(false);
  const isPaused = useSharedValue(false);
  const remainingSeconds = useSharedValue(duration);
  const elapsedSeconds = useSharedValue(0);
  const currentInterval = useSharedValue(1);
  const totalDuration = useSharedValue(duration);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    'worklet';
    if (remainingSeconds.value > 0) {
      remainingSeconds.value -= 1;
      elapsedSeconds.value += 1;
    } else if (currentInterval.value < intervals) {
      currentInterval.value += 1;
      remainingSeconds.value = restDuration;
    } else {
      isRunning.value = false;
    }
  }, [intervals, restDuration]);

  const start = useCallback(() => {
    isRunning.value = true;
    isPaused.value = false;
  }, []);

  const pause = useCallback(() => {
    isRunning.value = false;
    isPaused.value = true;
  }, []);

  const resume = useCallback(() => {
    isRunning.value = true;
    isPaused.value = false;
  }, []);

  const reset = useCallback(() => {
    isRunning.value = false;
    isPaused.value = false;
    remainingSeconds.value = duration;
    elapsedSeconds.value = 0;
    currentInterval.value = 1;
  }, [duration]);

  useEffect(() => {
    if (autoStart) {
      start();
    }
  }, [autoStart, start]);

  useEffect(() => {
    if (isRunning.value) {
      intervalRef.current = setInterval(() => {
        runOnUI(tick)();
      }, TICK_INTERVAL);
    } else {
      clearTimerInterval();
    }

    return clearTimerInterval;
  }, [isRunning.value, tick, clearTimerInterval]);

  const getState = useCallback(
    (): TimerState => ({
      isRunning: isRunning.value,
      isPaused: isPaused.value,
      remainingSeconds: remainingSeconds.value,
      elapsedSeconds: elapsedSeconds.value,
      currentInterval: currentInterval.value,
    }),
    [],
  );

  return {
    isRunning,
    isPaused,
    remainingSeconds,
    elapsedSeconds,
    currentInterval,
    totalDuration,
    start,
    pause,
    resume,
    reset,
    getState,
  };
}
