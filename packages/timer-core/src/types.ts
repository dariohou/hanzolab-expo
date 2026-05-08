export interface TimerConfig {
  duration: number;
  restDuration?: number;
  intervals?: number;
  autoStart?: boolean;
  soundEnabled?: boolean;
}

export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  remainingSeconds: number;
  elapsedSeconds: number;
  currentInterval: number;
}

export type TimerEvent =
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESET' }
  | { type: 'TICK' }
  | { type: 'COMPLETE' }
  | { type: 'INTERVAL_COMPLETE' };
