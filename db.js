// db.js - Dexie.js Database Initialization & Prepopulation
const db = new Dexie("HevyDatabase");

// Define database schema
db.version(1).stores({
  exercises: 'id, name, muscleGroup, equipment, isCustom',
  routines: 'id, name, notes',
  workouts: 'id, name, startTime, endTime, duration, totalVolume, totalSets',
  settings: 'key'
});

db.version(2).stores({
  exercises: 'id, name, muscleGroup, equipment, isCustom',
  routines: 'id, name, notes',
  workouts: 'id, name, startTime, endTime, duration, totalVolume, totalSets, syncPending',
  bodyweight: 'id, date, weight, notes, syncPending',
  settings: 'key'
});

// Default exercise list to pre-populate
const DEFAULT_EXERCISES = [
  // Chest
  { id: 'bench-press-barbell', name: 'Bench Press (Barbell)', muscleGroup: 'Chest', equipment: 'Barbell', isCustom: false, notes: 'Flat bench barbell chest press.' },
  { id: 'bench-press-dumbbell', name: 'Bench Press (Dumbbell)', muscleGroup: 'Chest', equipment: 'Dumbbell', isCustom: false, notes: 'Flat bench dumbbell chest press.' },
  { id: 'incline-bench-press-barbell', name: 'Incline Bench Press (Barbell)', muscleGroup: 'Chest', equipment: 'Barbell', isCustom: false, notes: 'Incline bench barbell chest press.' },
  { id: 'incline-bench-press-dumbbell', name: 'Incline Bench Press (Dumbbell)', muscleGroup: 'Chest', equipment: 'Dumbbell', isCustom: false, notes: 'Incline bench dumbbell chest press.' },
  { id: 'decline-bench-press-barbell', name: 'Decline Bench Press (Barbell)', muscleGroup: 'Chest', equipment: 'Barbell', isCustom: false, notes: 'Decline bench barbell chest press.' },
  { id: 'decline-bench-press-dumbbell', name: 'Decline Bench Press (Dumbbell)', muscleGroup: 'Chest', equipment: 'Dumbbell', isCustom: false, notes: 'Decline bench dumbbell chest press.' },
  { id: 'chest-fly-cable', name: 'Chest Fly (Cable)', muscleGroup: 'Chest', equipment: 'Cable', isCustom: false, notes: 'Cable chest flyes.' },
  { id: 'chest-fly-dumbbell', name: 'Chest Fly (Dumbbell)', muscleGroup: 'Chest', equipment: 'Dumbbell', isCustom: false, notes: 'Flat bench dumbbell chest flyes.' },
  { id: 'chest-press-machine', name: 'Chest Press (Machine)', muscleGroup: 'Chest', equipment: 'Machine', isCustom: false, notes: 'Machine chest press.' },
  { id: 'pec-deck-machine', name: 'Pec Deck (Machine)', muscleGroup: 'Chest', equipment: 'Machine', isCustom: false, notes: 'Pec deck fly machine.' },
  { id: 'cable-crossover', name: 'Cable Crossover', muscleGroup: 'Chest', equipment: 'Cable', isCustom: false, notes: 'Standing cable crossovers.' },
  { id: 'push-up', name: 'Push Up', muscleGroup: 'Chest', equipment: 'Bodyweight', isCustom: false, notes: 'Standard floor pushups.' },
  { id: 'decline-push-up', name: 'Decline Push Up', muscleGroup: 'Chest', equipment: 'Bodyweight', isCustom: false, notes: 'Pushups with feet elevated on a bench.' },
  { id: 'dip-chest', name: 'Dips (Chest Focus)', muscleGroup: 'Chest', equipment: 'Bodyweight', isCustom: false, notes: 'Chest dips with slight forward lean.' },
  
  // Back
  { id: 'pull-up', name: 'Pull Up', muscleGroup: 'Back', equipment: 'Bodyweight', isCustom: false, notes: 'Overhand grip pullups.' },
  { id: 'chin-up', name: 'Chin Up', muscleGroup: 'Back', equipment: 'Bodyweight', isCustom: false, notes: 'Underhand grip chinups.' },
  { id: 'lat-pulldown-cable', name: 'Lat Pulldown (Cable)', muscleGroup: 'Back', equipment: 'Cable', isCustom: false, notes: 'Cable pulldowns targeting latissimus dorsi.' },
  { id: 'lat-pulldown-close-grip', name: 'Lat Pulldown (Close Grip)', muscleGroup: 'Back', equipment: 'Cable', isCustom: false, notes: 'Close grip lat pulldown.' },
  { id: 'bent-over-row-barbell', name: 'Bent Over Row (Barbell)', muscleGroup: 'Back', equipment: 'Barbell', isCustom: false, notes: 'Bent over barbell rowing.' },
  { id: 'one-arm-row-dumbbell', name: 'One Arm Row (Dumbbell)', muscleGroup: 'Back', equipment: 'Dumbbell', isCustom: false, notes: 'Single arm dumbbell row on bench.' },
  { id: 'seated-cable-row', name: 'Seated Cable Row', muscleGroup: 'Back', equipment: 'Cable', isCustom: false, notes: 'Seated horizontal cable row.' },
  { id: 't-bar-row', name: 'T-Bar Row', muscleGroup: 'Back', equipment: 'Barbell', isCustom: false, notes: 'T-bar rowing.' },
  { id: 'deadlift-barbell', name: 'Deadlift (Barbell)', muscleGroup: 'Back', equipment: 'Barbell', isCustom: false, notes: 'Conventional barbell deadlift.' },
  { id: 'rack-pull-barbell', name: 'Rack Pulls (Barbell)', muscleGroup: 'Back', equipment: 'Barbell', isCustom: false, notes: 'Partial deadlifts performed from a power rack.' },
  { id: 'straight-arm-pulldown-cable', name: 'Straight Arm Pulldown (Cable)', muscleGroup: 'Back', equipment: 'Cable', isCustom: false, notes: 'Standing straight-arm cable pulldowns.' },
  { id: 'dumbbell-shrug', name: 'Dumbbell Shrug', muscleGroup: 'Back', equipment: 'Dumbbell', isCustom: false, notes: 'Dumbbell shoulder shrugs for trapezius.' },
  { id: 'barbell-shrug', name: 'Barbell Shrug', muscleGroup: 'Back', equipment: 'Barbell', isCustom: false, notes: 'Barbell shoulder shrugs.' },
  { id: 'hyperextension-bodyweight', name: 'Hyperextension (Back Extension)', muscleGroup: 'Back', equipment: 'Bodyweight', isCustom: false, notes: 'Back extensions on a hyperextension bench.' },

  // Shoulders
  { id: 'overhead-press-barbell', name: 'Overhead Press (Barbell)', muscleGroup: 'Shoulders', equipment: 'Barbell', isCustom: false, notes: 'Standing barbell overhead press.' },
  { id: 'shoulder-press-dumbbell', name: 'Shoulder Press (Dumbbell)', muscleGroup: 'Shoulders', equipment: 'Dumbbell', isCustom: false, notes: 'Seated dumbbell shoulder press.' },
  { id: 'shoulder-press-machine', name: 'Shoulder Press (Machine)', muscleGroup: 'Shoulders', equipment: 'Machine', isCustom: false, notes: 'Machine overhead press.' },
  { id: 'arnold-press-dumbbell', name: 'Arnold Press (Dumbbell)', muscleGroup: 'Shoulders', equipment: 'Dumbbell', isCustom: false, notes: 'Dumbbell shoulder press with rotation.' },
  { id: 'lateral-raise-dumbbell', name: 'Lateral Raise (Dumbbell)', muscleGroup: 'Shoulders', equipment: 'Dumbbell', isCustom: false, notes: 'Standing dumbbell side raises.' },
  { id: 'lateral-raise-cable', name: 'Lateral Raise (Cable)', muscleGroup: 'Shoulders', equipment: 'Cable', isCustom: false, notes: 'Cable lateral raises.' },
  { id: 'front-raise-dumbbell', name: 'Front Raise (Dumbbell)', muscleGroup: 'Shoulders', equipment: 'Dumbbell', isCustom: false, notes: 'Standing dumbbell front raises.' },
  { id: 'front-raise-barbell', name: 'Front Raise (Barbell)', muscleGroup: 'Shoulders', equipment: 'Barbell', isCustom: false, notes: 'Standing barbell front raises.' },
  { id: 'upright-row-barbell', name: 'Upright Row (Barbell)', muscleGroup: 'Shoulders', equipment: 'Barbell', isCustom: false, notes: 'Standing barbell upright row.' },
  { id: 'rear-delt-fly-dumbbell', name: 'Rear Delt Fly (Dumbbell)', muscleGroup: 'Shoulders', equipment: 'Dumbbell', isCustom: false, notes: 'Bent-over dumbbell rear delt flyes.' },
  { id: 'rear-delt-fly-machine', name: 'Rear Delt Fly (Machine)', muscleGroup: 'Shoulders', equipment: 'Machine', isCustom: false, notes: 'Reverse pec deck rear delt flyes.' },
  { id: 'face-pull-cable', name: 'Face Pull (Cable)', muscleGroup: 'Shoulders', equipment: 'Cable', isCustom: false, notes: 'Cable rope face pulls.' },

  // Biceps
  { id: 'bicep-curl-dumbbell', name: 'Bicep Curl (Dumbbell)', muscleGroup: 'Biceps', equipment: 'Dumbbell', isCustom: false, notes: 'Alternating dumbbell bicep curls.' },
  { id: 'hammer-curl-dumbbell', name: 'Hammer Curl (Dumbbell)', muscleGroup: 'Biceps', equipment: 'Dumbbell', isCustom: false, notes: 'Neutral grip dumbbell hammer curls.' },
  { id: 'barbell-curl', name: 'Barbell Curl', muscleGroup: 'Biceps', equipment: 'Barbell', isCustom: false, notes: 'Standing barbell curls.' },
  { id: 'preacher-curl-ez-bar', name: 'Preacher Curl (EZ Bar)', muscleGroup: 'Biceps', equipment: 'Barbell', isCustom: false, notes: 'EZ bar curls on preacher bench.' },
  { id: 'concentration-curl-dumbbell', name: 'Concentration Curl (Dumbbell)', muscleGroup: 'Biceps', equipment: 'Dumbbell', isCustom: false, notes: 'Seated concentration dumbbell curls.' },
  { id: 'cable-bicep-curl', name: 'Cable Bicep Curl', muscleGroup: 'Biceps', equipment: 'Cable', isCustom: false, notes: 'Standing cable bicep curls.' },
  { id: 'incline-dumbbell-curl', name: 'Incline Dumbbell Curl', muscleGroup: 'Biceps', equipment: 'Dumbbell', isCustom: false, notes: 'Incline bench dumbbell curls.' },
  { id: 'spider-curl-dumbbell', name: 'Spider Curl (Dumbbell)', muscleGroup: 'Biceps', equipment: 'Dumbbell', isCustom: false, notes: 'Incline chest-supported dumbbell spider curls.' },

  // Triceps
  { id: 'triceps-pushdown-cable', name: 'Triceps Pushdown (Cable - Rope)', muscleGroup: 'Triceps', equipment: 'Cable', isCustom: false, notes: 'Cable pushdowns using rope.' },
  { id: 'triceps-pushdown-cable-bar', name: 'Triceps Pushdown (Cable - Bar)', muscleGroup: 'Triceps', equipment: 'Cable', isCustom: false, notes: 'Cable pushdowns using a straight or v-bar.' },
  { id: 'overhead-triceps-ext-dumbbell', name: 'Overhead Triceps Extension (Dumbbell)', muscleGroup: 'Triceps', equipment: 'Dumbbell', isCustom: false, notes: 'Seated or standing overhead extension.' },
  { id: 'overhead-triceps-ext-cable', name: 'Overhead Triceps Extension (Cable)', muscleGroup: 'Triceps', equipment: 'Cable', isCustom: false, notes: 'Overhead extension with cable rope.' },
  { id: 'skull-crusher-ez-bar', name: 'Skull Crusher (EZ Bar)', muscleGroup: 'Triceps', equipment: 'Barbell', isCustom: false, notes: 'Lying triceps extensions.' },
  { id: 'lying-triceps-ext-dumbbell', name: 'Lying Triceps Extension (Dumbbell)', muscleGroup: 'Triceps', equipment: 'Dumbbell', isCustom: false, notes: 'Lying dumbbell triceps extensions.' },
  { id: 'triceps-dip', name: 'Triceps Dip', muscleGroup: 'Triceps', equipment: 'Bodyweight', isCustom: false, notes: 'Parallel bar or bench dips.' },
  { id: 'triceps-kickback-dumbbell', name: 'Triceps Kickback (Dumbbell)', muscleGroup: 'Triceps', equipment: 'Dumbbell', isCustom: false, notes: 'Dumbbell triceps kickback.' },
  { id: 'close-grip-bench-press', name: 'Close Grip Bench Press (Barbell)', muscleGroup: 'Triceps', equipment: 'Barbell', isCustom: false, notes: 'Barbell bench press with narrow grip.' },

  // Legs (Quads, Hamstrings, Calves)
  { id: 'squat-barbell', name: 'Squat (Barbell)', muscleGroup: 'Legs', equipment: 'Barbell', isCustom: false, notes: 'Barbell back squat.' },
  { id: 'squat-dumbbell', name: 'Squat (Dumbbell)', muscleGroup: 'Legs', equipment: 'Dumbbell', isCustom: false, notes: 'Dumbbell squats.' },
  { id: 'leg-press', name: 'Leg Press', muscleGroup: 'Legs', equipment: 'Machine', isCustom: false, notes: '45-degree leg press machine.' },
  { id: 'hack-squat-machine', name: 'Hack Squat (Machine)', muscleGroup: 'Legs', equipment: 'Machine', isCustom: false, notes: 'Hack squat machine.' },
  { id: 'leg-extension-machine', name: 'Leg Extension (Machine)', muscleGroup: 'Legs', equipment: 'Machine', isCustom: false, notes: 'Seated leg extension for quadriceps.' },
  { id: 'leg-curl-machine', name: 'Leg Curl (Machine)', muscleGroup: 'Legs', equipment: 'Machine', isCustom: false, notes: 'Lying or seated leg curls for hamstrings.' },
  { id: 'calf-raise-standing', name: 'Calf Raise (Standing)', muscleGroup: 'Legs', equipment: 'Bodyweight', isCustom: false, notes: 'Standing calf raises.' },
  { id: 'calf-raise-seated', name: 'Calf Raise (Seated)', muscleGroup: 'Legs', equipment: 'Machine', isCustom: false, notes: 'Seated calf raise machine.' },
  { id: 'bulgarian-split-squat-dumbbell', name: 'Bulgarian Split Squat (Dumbbell)', muscleGroup: 'Legs', equipment: 'Dumbbell', isCustom: false, notes: 'Single-leg split squats with foot elevated.' },
  { id: 'romanian-deadlift-barbell', name: 'Romanian Deadlift (Barbell)', muscleGroup: 'Legs', equipment: 'Barbell', isCustom: false, notes: 'Barbell Romanian deadlift (RDL).' },
  { id: 'romanian-deadlift-dumbbell', name: 'Romanian Deadlift (Dumbbell)', muscleGroup: 'Legs', equipment: 'Dumbbell', isCustom: false, notes: 'Dumbbell Romanian deadlift.' },
  { id: 'hip-thrust-barbell', name: 'Hip Thrust (Barbell)', muscleGroup: 'Legs', equipment: 'Barbell', isCustom: false, notes: 'Barbell hip thrust on a bench.' },
  { id: 'glute-bridge-bodyweight', name: 'Glute Bridge', muscleGroup: 'Legs', equipment: 'Bodyweight', isCustom: false, notes: 'Bodyweight glute bridge.' },
  { id: 'goblet-squat-dumbbell', name: 'Goblet Squat (Dumbbell)', muscleGroup: 'Legs', equipment: 'Dumbbell', isCustom: false, notes: 'Squats holding a dumbbell in front.' },
  { id: 'walking-lunge-dumbbell', name: 'Walking Lunge (Dumbbell)', muscleGroup: 'Legs', equipment: 'Dumbbell', isCustom: false, notes: 'Dumbbell walking lunges.' },

  // Abs / Core
  { id: 'crunch', name: 'Abdominal Crunch', muscleGroup: 'Core', equipment: 'Bodyweight', isCustom: false, notes: 'Standard abdominal crunch.' },
  { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', muscleGroup: 'Core', equipment: 'Bodyweight', isCustom: false, notes: 'Hanging leg raises from a pullup bar.' },
  { id: 'hanging-knee-raise', name: 'Hanging Knee Raise', muscleGroup: 'Core', equipment: 'Bodyweight', isCustom: false, notes: 'Hanging knee raises from pullup bar.' },
  { id: 'plank', name: 'Plank', muscleGroup: 'Core', equipment: 'Bodyweight', isCustom: false, notes: 'Static forearm plank hold.' },
  { id: 'russian-twist', name: 'Russian Twist', muscleGroup: 'Core', equipment: 'Bodyweight', isCustom: false, notes: 'Seated core twist.' },
  { id: 'ab-wheel-rollout', name: 'Ab Wheel Rollout', muscleGroup: 'Core', equipment: 'Bodyweight', isCustom: false, notes: 'Rollouts using ab wheel.' },
  { id: 'cable-woodchopper', name: 'Cable Woodchopper', muscleGroup: 'Core', equipment: 'Cable', isCustom: false, notes: 'Cable rotation for obliques.' },
  { id: 'bicycle-crunch', name: 'Bicycle Crunch', muscleGroup: 'Core', equipment: 'Bodyweight', isCustom: false, notes: 'Alternating bicycle crunch.' },
  { id: 'lying-leg-raise', name: 'Leg Raise (Lying)', muscleGroup: 'Core', equipment: 'Bodyweight', isCustom: false, notes: 'Lying leg raises for lower abs.' },

  // Cardio
  { id: 'treadmill-running', name: 'Treadmill Running', muscleGroup: 'Cardio', equipment: 'Machine', isCustom: false, notes: 'Running on a treadmill.' },
  { id: 'stationary-cycling', name: 'Stationary Cycling', muscleGroup: 'Cardio', equipment: 'Machine', isCustom: false, notes: 'Riding stationary exercise bike.' },
  { id: 'rowing-machine', name: 'Rowing Machine', muscleGroup: 'Cardio', equipment: 'Machine', isCustom: false, notes: 'Rowing machine cardio session.' },
  { id: 'elliptical-trainer', name: 'Elliptical Trainer', muscleGroup: 'Cardio', equipment: 'Machine', isCustom: false, notes: 'Elliptical cardio session.' },
  { id: 'jump-rope', name: 'Jump Rope', muscleGroup: 'Cardio', equipment: 'Bodyweight', isCustom: false, notes: 'Skipping rope exercise.' },
  { id: 'burpee', name: 'Burpee', muscleGroup: 'Cardio', equipment: 'Bodyweight', isCustom: false, notes: 'Full-body burpee movements.' },
  { id: 'mountain-climber', name: 'Mountain Climber', muscleGroup: 'Cardio', equipment: 'Bodyweight', isCustom: false, notes: 'Mountain climbers.' }
];

// Seed initial exercises if they don't exist
db.on("populate", () => {
  console.log("Populating database with default exercises...");
  db.exercises.bulkAdd(DEFAULT_EXERCISES);
  
  // Set default settings
  db.settings.bulkAdd([
    { key: 'units', value: 'lbs' }, // 'lbs' or 'kg'
    { key: 'defaultRestTime', value: 90 }, // in seconds
    { key: 'vibrateOnTimerEnd', value: true },
    { key: 'soundOnTimerEnd', value: true },
    { key: 'syncUrl', value: 'https://script.google.com/macros/s/AKfycbzAlemxHzTHpmFUnGpaZjIc63z4ZOAVwT4QbkGdwI_gflWLY1aDxJl_YcfsMmoU2BD/exec' }
  ]);
  
  // Seed a sample routine to get the user started!
  const sampleRoutine = {
    id: 'sample-upper-body',
    name: 'Sample Upper Body',
    notes: 'A standard upper body strength foundation routine.',
    exercises: [
      {
        exerciseId: 'bench-press-barbell',
        sets: [
          { type: 'Normal', weight: 135, reps: 10, completed: false },
          { type: 'Normal', weight: 145, reps: 8, completed: false },
          { type: 'Normal', weight: 155, reps: 6, completed: false }
        ]
      },
      {
        exerciseId: 'lat-pulldown-cable',
        sets: [
          { type: 'Normal', weight: 100, reps: 12, completed: false },
          { type: 'Normal', weight: 110, reps: 10, completed: false },
          { type: 'Normal', weight: 120, reps: 8, completed: false }
        ]
      },
      {
        exerciseId: 'overhead-press-barbell',
        sets: [
          { type: 'Normal', weight: 75, reps: 10, completed: false },
          { type: 'Normal', weight: 85, reps: 8, completed: false }
        ]
      }
    ]
  };
  db.routines.add(sampleRoutine);
});

// Helper database functions to expose
const dbHelper = {
  // Exercises
  async getExercises() {
    let list = await db.exercises.toArray();
    // Check if any DEFAULT_EXERCISES are missing (e.g. if new defaults are added)
    const missing = DEFAULT_EXERCISES.filter(d => !list.some(existing => existing.id === d.id));
    if (missing.length > 0) {
      console.log(`Seeding ${missing.length} missing default exercises...`);
      await db.exercises.bulkAdd(missing);
      list = await db.exercises.toArray();
    }
    return list;
  },
  async addCustomExercise(name, muscleGroup, equipment, notes = '') {
    const id = 'custom-' + Date.now();
    const newEx = { id, name, muscleGroup, equipment, isCustom: true, notes };
    await db.exercises.add(newEx);
    return newEx;
  },
  
  // Routines
  async getRoutines() {
    return await db.routines.toArray();
  },
  async saveRoutine(routine) {
    if (!routine.id) {
      routine.id = 'routine-' + Date.now();
    }
    await db.routines.put(routine);
    return routine;
  },
  async deleteRoutine(id) {
    await db.routines.delete(id);
  },

  // Workouts (History)
  async getWorkouts() {
    // Sort workouts by startTime descending
    const workouts = await db.workouts.toArray();
    return workouts.sort((a, b) => b.startTime - a.startTime);
  },
  async saveWorkout(workout) {
    if (!workout.id) {
      workout.id = 'workout-' + Date.now();
    }
    workout.syncPending = workout.syncPending !== undefined ? workout.syncPending : 1;
    await db.workouts.put(workout);
    return workout;
  },
  async deleteWorkout(id) {
    await db.workouts.delete(id);
  },

  // Bodyweight (Metrics)
  async getBodyweightLogs() {
    const logs = await db.bodyweight.toArray();
    return logs.sort((a, b) => new Date(b.date) - new Date(a.date));
  },
  async saveBodyweight(record) {
    if (!record.id) {
      record.id = 'weight-' + Date.now();
    }
    record.syncPending = record.syncPending !== undefined ? record.syncPending : 1;
    await db.bodyweight.put(record);
    return record;
  },
  async deleteBodyweight(id) {
    await db.bodyweight.delete(id);
  },

  // Sync Pending Fetch Helpers
  async getPendingSyncWorkouts() {
    return await db.workouts.where('syncPending').equals(1).toArray();
  },
  async getPendingSyncBodyweight() {
    return await db.bodyweight.where('syncPending').equals(1).toArray();
  },

  // Settings
  async getSetting(key, defaultValue) {
    const item = await db.settings.get(key);
    return item ? item.value : defaultValue;
  },
  async saveSetting(key, value) {
    await db.settings.put({ key, value });
  },
  
  // Database backup operations
  async exportBackup() {
    const exercises = await db.exercises.toArray();
    const routines = await db.routines.toArray();
    const workouts = await db.workouts.toArray();
    const bodyweight = await db.bodyweight.toArray();
    const settings = await db.settings.toArray();
    
    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      exercises,
      routines,
      workouts,
      bodyweight,
      settings
    };
  },
  
  async importBackup(data) {
    if (!data || (data.version !== 1 && data.version !== 2)) {
      throw new Error("Invalid backup format");
    }
    
    // Clear and restore tables
    await db.transaction('rw', [db.exercises, db.routines, db.workouts, db.bodyweight, db.settings], async () => {
      if (data.exercises && data.exercises.length) {
        await db.exercises.clear();
        await db.exercises.bulkAdd(data.exercises);
      }
      if (data.routines) {
        await db.routines.clear();
        if (data.routines.length) await db.routines.bulkAdd(data.routines);
      }
      if (data.workouts) {
        await db.workouts.clear();
        if (data.workouts.length) await db.workouts.bulkAdd(data.workouts);
      }
      if (data.bodyweight) {
        await db.bodyweight.clear();
        if (data.bodyweight.length) await db.bodyweight.bulkAdd(data.bodyweight);
      }
      if (data.settings) {
        await db.settings.clear();
        if (data.settings.length) await db.settings.bulkAdd(data.settings);
      }
    });
    
    return true;
  }
};
