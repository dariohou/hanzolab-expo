# Database Schemas

## Overview

Each app has its own PostgreSQL database with isolated schemas. This document defines the initial database structure for all three apps.

---

## Shared Auth Schema

While authentication is shared across apps, users are tagged by `app_id`:

```sql
-- Auth schema (shared across all apps)
CREATE TABLE auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  app_id TEXT NOT NULL, -- 'qigong', 'walking', or 'gtg'
  metadata JSONB DEFAULT '{}'
);

-- Sessions table
CREATE TABLE auth.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  refresh_token_hash TEXT NOT NULL
);

-- Create indexes for auth tables
CREATE INDEX idx_auth_users_email ON auth.users(email);
CREATE INDEX idx_auth_users_app_id ON auth.users(app_id);
CREATE INDEX idx_auth_sessions_user_id ON auth.sessions(user_id);
```

---

## GTG (Greasing the Groove) Database

### Database: `gtg_db`

```sql
-- GTG Schema

-- Exercise definitions (from shared exercise-data, but user can customize)
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  muscle_groups TEXT[] DEFAULT '{}',
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  default_reps INTEGER DEFAULT 10,
  default_sets INTEGER DEFAULT 5,
  instructions TEXT[] DEFAULT '{}',
  is_custom BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User's workout sessions
CREATE TABLE workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_reps INTEGER DEFAULT 0,
  total_sets INTEGER DEFAULT 0,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Individual exercise entries within a session
CREATE TABLE workout_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
  custom_exercise_name TEXT, -- If exercise was deleted but name preserved
  reps INTEGER NOT NULL,
  sets_completed INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

-- Program templates (user-created programs)
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  share_code TEXT UNIQUE, -- Generated code for sharing
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Exercises within a program
CREATE TABLE program_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
  custom_exercise_name TEXT,
  order_index INTEGER NOT NULL,
  target_reps INTEGER,
  target_sets INTEGER,
  rest_duration_seconds INTEGER DEFAULT 60
);

-- User progress tracking
CREATE TABLE progress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  metric_type TEXT NOT NULL, -- 'reps', 'weight', 'endurance'
  exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
  value INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notification settings
CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reminders_enabled BOOLEAN DEFAULT true,
  reminder_times TIME[] DEFAULT '{}',
  sound_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_exercises_user_id ON exercises(user_id);
CREATE INDEX idx_workout_sessions_user_date ON workout_sessions(user_id, date);
CREATE INDEX idx_workout_entries_session_id ON workout_entries(session_id);
CREATE INDEX idx_programs_user_id ON programs(user_id);
CREATE INDEX idx_program_exercises_program_id ON program_exercises(program_id);
CREATE INDEX idx_progress_logs_user_date ON progress_logs(user_id, date);
```

---

## Walking App Database

### Database: `walking_db`

```sql
-- Walking Schema

-- Saved routes
CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  distance_meters INTEGER NOT NULL,
  estimated_duration_minutes INTEGER,
  difficulty TEXT CHECK (difficulty IN ('easy', 'moderate', 'hard')) DEFAULT 'moderate',
  start_lat DOUBLE PRECISION NOT NULL,
  start_lng DOUBLE PRECISION NOT NULL,
  end_lat DOUBLE PRECISION NOT NULL,
  end_lng DOUBLE PRECISION NOT NULL,
  route_geojson JSONB, -- Full route geometry
  elevation_gain_meters INTEGER,
  is_circular BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  share_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Waypoints (spots to visit along route)
CREATE TABLE waypoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  order_index INTEGER NOT NULL,
  stop_duration_minutes INTEGER DEFAULT 0,
  waypoint_type TEXT CHECK (waypoint_type IN ('poi', 'rest', 'photo', 'food', 'other')) DEFAULT 'poi',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Completed walks
CREATE TABLE walks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  distance_meters INTEGER,
  duration_minutes INTEGER,
  calories_burned INTEGER,
  average_pace DOUBLE PRECISION,
  completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Walk waypoints (actual visited during walk)
CREATE TABLE walk_waypoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  walk_id UUID REFERENCES walks(id) ON DELETE CASCADE,
  waypoint_id UUID REFERENCES waypoints(id) ON DELETE SET NULL,
  visited_at TIMESTAMPTZ,
  skipped BOOLEAN DEFAULT false
);

-- Photos taken during walks
CREATE TABLE walk_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  walk_id UUID REFERENCES walks(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'walking',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  taken_at TIMESTAMPTZ DEFAULT now(),
  caption TEXT
);

-- Favorite locations
CREATE TABLE favorite_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  location_type TEXT CHECK (location_type IN ('start', 'end', 'favorite', 'frequently_visited')) DEFAULT 'favorite',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_routes_user_id ON routes(user_id);
CREATE INDEX idx_routes_public ON routes(is_public) WHERE is_public = true;
CREATE INDEX idx_waypoints_route_id ON waypoints(route_id);
CREATE INDEX idx_walks_user_id ON walks(user_id);
CREATE INDEX idx_walks_route_id ON walks(route_id);
CREATE INDEX idx_walk_photos_walk_id ON walk_photos(walk_id);
CREATE INDEX idx_favorite_locations_user_id ON favorite_locations(user_id);
```

---

## Qigong App Database

### Database: `qigong_db`

```sql
-- Qigong Schema

-- Exercise definitions (extended with Qigong-specific fields)
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('breathing', 'movement', 'meditation', 'stretch')) DEFAULT 'movement',
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  duration_seconds INTEGER DEFAULT 60,
  instructions TEXT[] DEFAULT '{}',
  breathing_pattern TEXT, -- e.g., "4s in, 7s hold, 8s out"
  movement_type TEXT CHECK (movement_type IN ('static', 'flowing', 'dynamic')) DEFAULT 'static',
  lottie_animation_url TEXT,
  is_custom BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Programs (collections of exercises)
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  category TEXT, -- e.g., 'morning', 'stress_relief', 'energy'
  total_duration_seconds INTEGER,
  is_public BOOLEAN DEFAULT false,
  is_template BOOLEAN DEFAULT false, -- Pre-built templates
  share_code TEXT UNIQUE,
  times_completed INTEGER DEFAULT 0,
  last_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Exercises within a program
CREATE TABLE program_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL,
  duration_seconds INTEGER,
  repetitions INTEGER DEFAULT 1,
  rest_duration_seconds INTEGER DEFAULT 5,
  notes TEXT
);

-- User's program sessions (completed runs)
CREATE TABLE program_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  actual_duration_seconds INTEGER,
  completed BOOLEAN DEFAULT false,
  current_exercise_index INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User's progress over time
CREATE TABLE progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  programs_completed INTEGER DEFAULT 0,
  total_minutes INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Favorites and bookmarks
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('program', 'exercise')),
  item_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, item_type, item_id)
);

-- Shared programs (from other users)
CREATE TABLE shared_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  shared_by_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  share_code TEXT UNIQUE NOT NULL,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_exercises_user_id ON exercises(user_id);
CREATE INDEX idx_exercises_category ON exercises(category);
CREATE INDEX idx_programs_user_id ON programs(user_id);
CREATE INDEX idx_programs_public ON programs(is_public) WHERE is_public = true;
CREATE INDEX idx_program_exercises_program_id ON program_exercises(program_id);
CREATE INDEX idx_program_sessions_user_id ON program_sessions(user_id);
CREATE INDEX idx_program_sessions_date ON program_sessions(started_at);
CREATE INDEX idx_progress_user_date ON progress(user_id, date);
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_shared_programs_share_code ON shared_programs(share_code);
```

---

## Supabase Storage Buckets

```sql
-- Storage configuration (run in Supabase dashboard or via API)

-- GTG buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('gtg-exports', 'gtg-exports', true);

-- Walking buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('walking-photos', 'walking-photos', false);

-- Qigong buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('qigong-animations', 'qigong-animations', true);
INSERT INTO storage.buckets (id, name, public) 
VALUES ('qigong-exports', 'qigong-exports', true);
```

---

## Row Level Security (RLS) Policies

### GTG Database RLS

```sql
-- Enable RLS
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_logs ENABLE ROW LEVEL SECURITY;

-- Exercises: Users can only see their own
CREATE POLICY "Users can view own exercises"
ON exercises FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exercises"
ON exercises FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercises"
ON exercises FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercises"
ON exercises FOR DELETE
USING (auth.uid() = user_id);

-- Workout sessions: Users only see their own
CREATE POLICY "Users can view own sessions"
ON workout_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
ON workout_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Programs: Users see own + public templates
CREATE POLICY "Users can view own and public programs"
ON programs FOR SELECT
USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can insert own programs"
ON programs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own programs"
ON programs FOR UPDATE
USING (auth.uid() = user_id);

-- Similar policies for other tables...
```

---

## Migrations Workflow

When making schema changes:

```bash
# 1. Make changes locally (Supabase Studio or SQL)
# 2. Generate migration
npx supabase db diff -f migration_name

# 3. Review migration file
cat supabase/migrations/001_migration_name.sql

# 4. Apply locally
npx supabase db reset

# 5. Deploy to production
npx supabase db push --db-url postgresql://postgres:[PASSWORD]@[HOST]:54322/[DB]
```

---

## Initial Data Seed

For development, seed basic exercise data:

```sql
-- GTG default exercises
INSERT INTO exercises (user_id, name, description, muscle_groups, default_reps, default_sets) VALUES
  (NULL, 'Push-ups', 'Classic push-ups for chest and triceps', ARRAY['chest', 'triceps', 'shoulders'], 10, 5),
  (NULL, 'Pull-ups', 'Bodyweight pull-ups for back', ARRAY['back', 'biceps'], 5, 5),
  (NULL, 'Squats', 'Bodyweight squats for legs', ARRAY['quadriceps', 'glutes', 'hamstrings'], 15, 5),
  (NULL, 'Dips', 'Parallel bar dips', ARRAY['chest', 'triceps'], 10, 5),
  (NULL, 'Lunges', 'Walking lunges', ARRAY['quadriceps', 'glutes'], 12, 3);
```

---

## Notes

- All timestamps use `TIMESTAMPTZ` for proper timezone handling
- UUID primary keys use `gen_random_uuid()` for security
- Soft deletes (using `deleted_at`) not included in initial schema but recommended for production
- JSONB used for flexible metadata and GeoJSON storage
- Indexes created for all foreign keys and commonly queried fields
- `app_id` filter should be applied at application level for auth queries