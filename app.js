// app.js - Hevy Workout Tracker PWA Controller

// ==========================================
// PWA Service Worker Registration
// ==========================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('Service Worker registered successfully!', reg.scope))
      .catch((err) => console.log('Service Worker registration failed:', err));
  });
}

// ==========================================
// SPA Router & Navigation System
// ==========================================
const router = {
  activeTab: 'profile',
  
  init() {
    // Set active tab styling and show/hide corresponding screens
    this.navigate(this.activeTab);
  },
  
  navigate(tabName) {
    this.activeTab = tabName;
    
    // Update bottoms nav tabs UI styling
    document.querySelectorAll('nav .nav-tab').forEach((tab) => {
      const iconText = tab.querySelector('span').innerText.toLowerCase();
      if (iconText === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    
    // Update main tab container visibility
    document.querySelectorAll('.tab-screen').forEach((screen) => {
      if (screen.id === `tab-${tabName}`) {
        screen.classList.add('active');
      } else {
        screen.classList.remove('active');
      }
    });

    // Update Top Header Bar Title
    const titleMap = {
      'profile': 'HEVY PROFILE',
      'workouts': 'WORKOUT TEMPLATES',
      'exercises': 'EXERCISE LIBRARY',
      'history': 'TRAINING HISTORY'
    };
    document.getElementById('header-title').innerText = titleMap[tabName] || 'HEVY';

    // Fetch tab-specific data on load
    if (tabName === 'profile') dashboardManager.render();
    if (tabName === 'workouts') routinesManager.render();
    if (tabName === 'exercises') exerciseLibrary.render();
    if (tabName === 'history') historyManager.render();
  }
};

// ==========================================
// Modal Display Manager
// ==========================================
const modalManager = {
  open(modalId) {
    const overlay = document.getElementById(modalId);
    if (overlay) {
      overlay.classList.add('active');
      lucide.createIcons(); // Refresh icons inside modal
    }
  },
  
  close(modalId) {
    const overlay = document.getElementById(modalId);
    if (overlay) {
      overlay.classList.remove('active');
    }
  }
};

// ==========================================
// Settings Manager (Units & Default Timer)
// ==========================================
const settingsManager = {
  units: 'lbs',
  defaultRestTime: 90,

  async init() {
    this.units = await dbHelper.getSetting('units', 'lbs');
    this.defaultRestTime = parseInt(await dbHelper.getSetting('defaultRestTime', 90));
    
    // Set UI dropdown selections
    document.getElementById('setting-units').value = this.units;
    document.getElementById('setting-rest').value = this.defaultRestTime.toString();
  },

  async updateUnits(newUnit) {
    this.units = newUnit;
    await dbHelper.saveSetting('units', newUnit);
    dashboardManager.render();
  },

  async updateDefaultRest(newRest) {
    this.defaultRestTime = parseInt(newRest);
    await dbHelper.saveSetting('defaultRestTime', this.defaultRestTime);
  },

  // Export DB content as a downloadable JSON file
  async exportData() {
    try {
      const backup = await dbHelper.exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `hevy-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to export backup: " + err.message);
    }
  },

  // Import JSON backup and replace IndexedDB contents
  async importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (confirm("Importing this backup will OVERWRITE your current training logs and settings. Proceed?")) {
          await dbHelper.importBackup(data);
          alert("Backup successfully restored!");
          window.location.reload(); // Refresh app to load new database tables
        }
      } catch (err) {
        alert("Failed to import backup. Please check that the JSON file is valid. " + err.message);
      }
    };
    reader.readAsText(file);
  }
};

// ==========================================
// Exercise Library Controller
// ==========================================
const exerciseLibrary = {
  exercises: [],
  selectedMuscle: 'All',
  selectorMode: null, // 'workout' or 'routine'
  chosenExerciseIds: new Set(),

  async load() {
    this.exercises = await dbHelper.getExercises();
    // Sort exercises alphabetically
    this.exercises.sort((a, b) => a.name.localeCompare(b.name));
  },

  render() {
    this.renderMuscleFilters();
    this.filterExercises();
  },

  renderMuscleFilters() {
    const muscles = ['All', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Core'];
    const container = document.getElementById('muscle-filters');
    container.innerHTML = muscles.map(m => `
      <div class="muscle-pill ${this.selectedMuscle === m ? 'active' : ''}" onclick="exerciseLibrary.setMuscleFilter('${m}')">${m}</div>
    `).join('');
  },

  setMuscleFilter(muscle) {
    this.selectedMuscle = muscle;
    this.renderMuscleFilters();
    if (this.selectorMode) {
      this.filterSelectExercises();
    } else {
      this.filterExercises();
    }
  },

  filterExercises() {
    const query = document.getElementById('exercise-search').value.toLowerCase();
    const container = document.getElementById('exercise-list-container');
    
    const filtered = this.exercises.filter(ex => {
      const matchQuery = ex.name.toLowerCase().includes(query) || (ex.notes && ex.notes.toLowerCase().includes(query));
      const matchMuscle = this.selectedMuscle === 'All' || ex.muscleGroup === this.selectedMuscle;
      return matchQuery && matchMuscle;
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-muted); margin-top: 24px;">No exercises found.</div>`;
      return;
    }

    container.innerHTML = filtered.map(ex => `
      <div class="exercise-item" onclick="exerciseLibrary.viewDetails('${ex.id}')">
        <div class="exercise-info">
          <h4>${ex.name}</h4>
          <span>${ex.muscleGroup} • ${ex.equipment}</span>
        </div>
        <i data-lucide="chevron-right" style="color: var(--text-muted);"></i>
      </div>
    `).join('');
    lucide.createIcons();
  },

  async viewDetails(exerciseId) {
    const ex = this.exercises.find(e => e.id === exerciseId);
    if (!ex) return;

    document.getElementById('edm-title').innerText = ex.name;
    modalManager.open('exercise-detail-modal');

    // Retrieve exercise workout history to calculate PRs
    const history = await dbHelper.getWorkouts();
    const exLogs = [];
    let prWeight = 0;
    let prVolume = 0;
    let oneRepMax = 0;

    history.forEach(w => {
      const foundEx = w.exercises.find(e => e.exerciseId === exerciseId);
      if (foundEx) {
        const completedSets = foundEx.sets.filter(s => s.completed);
        if (completedSets.length) {
          exLogs.push({
            workoutName: w.name,
            date: new Date(w.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
            sets: completedSets
          });

          completedSets.forEach(s => {
            const wVal = parseFloat(s.weight) || 0;
            const rVal = parseInt(s.reps) || 0;
            if (wVal > prWeight) prWeight = wVal;
            
            const vol = wVal * rVal;
            if (vol > prVolume) prVolume = vol;

            // Brzycki Formula for estimated 1RM
            if (rVal > 0) {
              const est1RM = wVal / (1.0278 - 0.0278 * rVal);
              if (est1RM > oneRepMax) oneRepMax = est1RM;
            }
          });
        }
      }
    });

    // Render PR Card
    const prContainer = document.getElementById('edm-prs-container');
    const u = settingsManager.units;
    prContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between;">
        <span style="color: var(--text-secondary)">Max Weight:</span>
        <strong>${prWeight ? prWeight + ' ' + u : '—'}</strong>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: var(--text-secondary)">Max Volume Set:</span>
        <strong>${prVolume ? prVolume + ' ' + u : '—'}</strong>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: var(--text-secondary)">Est. 1-Rep Max (1RM):</span>
        <strong>${oneRepMax ? Math.round(oneRepMax) + ' ' + u : '—'}</strong>
      </div>
    `;

    // Render historical log list
    const historyContainer = document.getElementById('edm-history-container');
    if (exLogs.length === 0) {
      historyContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 12px 0;">No completed sets logged yet.</div>`;
      return;
    }

    historyContainer.innerHTML = exLogs.map(log => `
      <div class="card" style="margin-bottom: 0;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <strong style="font-size: 13px;">${log.workoutName}</strong>
          <span style="font-size: 11px; color: var(--text-secondary);">${log.date}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${log.sets.map((s, idx) => `
            <div style="font-size: 12px; display: flex; justify-content: space-between;">
              <span style="color: var(--text-secondary)">Set ${idx + 1} (${s.type})</span>
              <strong>${s.weight} ${u} x ${s.reps} reps</strong>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  },

  openCreateModal() {
    document.getElementById('cem-name').value = '';
    document.getElementById('cem-notes').value = '';
    modalManager.open('exercise-create-modal');
  },

  async createCustomExercise() {
    const name = document.getElementById('cem-name').value.trim();
    const muscle = document.getElementById('cem-muscle').value;
    const equip = document.getElementById('cem-equipment').value;
    const notes = document.getElementById('cem-notes').value.trim();

    if (!name) {
      alert("Please enter an exercise name.");
      return;
    }

    const newEx = await dbHelper.addCustomExercise(name, muscle, equip, notes);
    await this.load(); // Reload array
    this.render(); // Redraw UI
    modalManager.close('exercise-create-modal');
  },

  // Multiple Exercise Selector Modal Shared Flow
  openSelectModal(mode) {
    this.selectorMode = mode;
    this.chosenExerciseIds.clear();
    this.selectedMuscle = 'All';
    document.getElementById('select-search').value = '';
    document.getElementById('select-count').innerText = '0';
    
    this.renderSelectMuscleFilters();
    this.filterSelectExercises();
    modalManager.open('exercise-select-modal');
  },

  renderSelectMuscleFilters() {
    const muscles = ['All', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Core'];
    const container = document.getElementById('select-muscle-filters');
    container.innerHTML = muscles.map(m => `
      <div class="muscle-pill ${this.selectedMuscle === m ? 'active' : ''}" onclick="exerciseLibrary.setSelectMuscleFilter('${m}')">${m}</div>
    `).join('');
  },

  setSelectMuscleFilter(muscle) {
    this.selectedMuscle = muscle;
    this.renderSelectMuscleFilters();
    this.filterSelectExercises();
  },

  filterSelectExercises() {
    const query = document.getElementById('select-search').value.toLowerCase();
    const container = document.getElementById('select-exercise-list');

    const filtered = this.exercises.filter(ex => {
      const matchQuery = ex.name.toLowerCase().includes(query);
      const matchMuscle = this.selectedMuscle === 'All' || ex.muscleGroup === this.selectedMuscle;
      return matchQuery && matchMuscle;
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-muted); margin-top: 16px;">No exercises.</div>`;
      return;
    }

    container.innerHTML = filtered.map(ex => `
      <div class="exercise-select-item ${this.chosenExerciseIds.has(ex.id) ? 'selected' : ''}" onclick="exerciseLibrary.toggleSelectChoice('${ex.id}', this)">
        <div>
          <strong style="font-size: 14px;">${ex.name}</strong>
          <div style="font-size: 10px; color: var(--text-secondary); margin-top: 2px;">${ex.muscleGroup} • ${ex.equipment}</div>
        </div>
        <i data-lucide="${this.chosenExerciseIds.has(ex.id) ? 'check-circle-2' : 'circle'}" style="color: ${this.chosenExerciseIds.has(ex.id) ? 'var(--accent-color)' : 'var(--text-muted)'}; width: 20px;"></i>
      </div>
    `).join('');
    lucide.createIcons();
  },

  toggleSelectChoice(exerciseId, element) {
    if (this.chosenExerciseIds.has(exerciseId)) {
      this.chosenExerciseIds.delete(exerciseId);
      element.classList.remove('selected');
      const icon = element.querySelector('i');
      icon.setAttribute('data-lucide', 'circle');
      icon.style.color = 'var(--text-muted)';
    } else {
      this.chosenExerciseIds.add(exerciseId);
      element.classList.add('selected');
      const icon = element.querySelector('i');
      icon.setAttribute('data-lucide', 'check-circle-2');
      icon.style.color = 'var(--accent-color)';
    }
    document.getElementById('select-count').innerText = this.chosenExerciseIds.size.toString();
    lucide.createIcons();
  },

  confirmSelection() {
    if (this.chosenExerciseIds.size === 0) {
      modalManager.close('exercise-select-modal');
      return;
    }

    const selectedList = Array.from(this.chosenExerciseIds).map(id => this.exercises.find(e => e.id === id));
    
    if (this.selectorMode === 'workout') {
      workoutManager.addExercises(selectedList);
    } else if (this.selectorMode === 'routine') {
      routinesManager.addExercises(selectedList);
    }

    modalManager.close('exercise-select-modal');
  }
};

// ==========================================
// Routines / Template Creator Controller
// ==========================================
const routinesManager = {
  routines: [],
  activeEditingRoutine: null,

  async render() {
    this.routines = await dbHelper.getRoutines();
    const container = document.getElementById('routines-list-container');

    if (this.routines.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px 0;">No routine templates saved. Create one above!</div>`;
      return;
    }

    container.innerHTML = this.routines.map(r => {
      // List down unique exercises in this routine
      const exNames = r.exercises.map(re => {
        const ex = exerciseLibrary.exercises.find(e => e.id === re.exerciseId);
        return ex ? ex.name : 'Unknown Exercise';
      });

      return `
        <div class="card template-card">
          <div class="card-header" onclick="routinesManager.startRoutine('${r.id}')" style="cursor: pointer; margin-bottom: 4px;">
            <div class="card-title">${r.name}</div>
            <i data-lucide="play-circle" style="color: var(--accent-color); width: 24px; height: 24px;"></i>
          </div>
          <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 8px;">${r.notes || 'No notes'}</div>
          
          <ul class="exercise-mini-list">
            ${exNames.map(name => `<li>• ${name}</li>`).join('')}
          </ul>
          
          <div class="template-actions">
            <button class="btn btn-sm btn-text" style="padding-left: 0; color: var(--accent-color);" onclick="routinesManager.openEditModal('${r.id}')">
              <i data-lucide="edit-3" style="width: 12px; height: 12px;"></i> Edit
            </button>
            <button class="btn btn-sm btn-text" style="color: var(--failure-color);" onclick="routinesManager.deleteRoutine('${r.id}')">
              <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i> Delete
            </button>
          </div>
        </div>
      `;
    }).join('');
    lucide.createIcons();
  },

  openCreateModal() {
    this.activeEditingRoutine = {
      id: null,
      name: '',
      notes: '',
      exercises: []
    };
    
    document.getElementById('rem-title').innerText = 'Create Routine';
    document.getElementById('rem-name').value = '';
    document.getElementById('rem-notes').value = '';
    document.getElementById('rem-exercises-container').innerHTML = '';
    
    modalManager.open('routine-editor-modal');
  },

  openEditModal(routineId) {
    const template = this.routines.find(r => r.id === routineId);
    if (!template) return;

    this.activeEditingRoutine = JSON.parse(JSON.stringify(template)); // Deep clone
    
    document.getElementById('rem-title').innerText = 'Edit Routine';
    document.getElementById('rem-name').value = this.activeEditingRoutine.name;
    document.getElementById('rem-notes').value = this.activeEditingRoutine.notes || '';
    
    this.renderRoutineEditorExercises();
    modalManager.open('routine-editor-modal');
  },

  renderRoutineEditorExercises() {
    const container = document.getElementById('rem-exercises-container');
    if (this.activeEditingRoutine.exercises.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 12px 0;">No exercises added to this template.</div>`;
      return;
    }

    container.innerHTML = this.activeEditingRoutine.exercises.map((re, exIdx) => {
      const ex = exerciseLibrary.exercises.find(e => e.id === re.exerciseId);
      const name = ex ? ex.name : 'Unknown Exercise';

      return `
        <div class="workout-exercise-card" style="margin-bottom: 0;">
          <div class="wec-header">
            <div class="wec-title">${name}</div>
            <button class="btn btn-sm btn-text" style="color: var(--failure-color);" onclick="routinesManager.removeExercise(${exIdx})">
              <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
          </div>
          <table class="set-table">
            <thead>
              <tr>
                <th style="width: 40px;">Set</th>
                <th>Lbs</th>
                <th>Reps</th>
              </tr>
            </thead>
            <tbody>
              ${re.sets.map((s, setIdx) => `
                <tr>
                  <td>
                    <div class="set-num-badge ${s.type}" onclick="routinesManager.toggleSetType(${exIdx}, ${setIdx})">${s.type === 'Normal' ? setIdx + 1 : s.type[0]}</div>
                  </td>
                  <td>
                    <input type="number" class="set-input" value="${s.weight || ''}" placeholder="—" oninput="routinesManager.updateSet(${exIdx}, ${setIdx}, 'weight', this.value)">
                  </td>
                  <td>
                    <input type="number" class="set-input" value="${s.reps || ''}" placeholder="—" oninput="routinesManager.updateSet(${exIdx}, ${setIdx}, 'reps', this.value)">
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="display: flex; gap: 8px; margin-top: 10px;">
            <button class="btn btn-sm btn-text" onclick="routinesManager.addSet(${exIdx})" style="padding: 4px 8px;">+ Add Set</button>
            <button class="btn btn-sm btn-text" style="color: var(--failure-color); padding: 4px 8px;" onclick="routinesManager.removeSet(${exIdx})">- Remove Set</button>
          </div>
        </div>
      `;
    }).join('');
    lucide.createIcons();
  },

  addExercises(exercises) {
    exercises.forEach(ex => {
      this.activeEditingRoutine.exercises.push({
        exerciseId: ex.id,
        sets: [
          { type: 'Normal', weight: '', reps: '' }
        ]
      });
    });
    this.renderRoutineEditorExercises();
  },

  removeExercise(idx) {
    this.activeEditingRoutine.exercises.splice(idx, 1);
    this.renderRoutineEditorExercises();
  },

  addSet(exIdx) {
    const sets = this.activeEditingRoutine.exercises[exIdx].sets;
    const lastSet = sets[sets.length - 1] || { type: 'Normal', weight: '', reps: '' };
    sets.push({
      type: 'Normal',
      weight: lastSet.weight,
      reps: lastSet.reps
    });
    this.renderRoutineEditorExercises();
  },

  removeSet(exIdx) {
    const sets = this.activeEditingRoutine.exercises[exIdx].sets;
    if (sets.length > 1) {
      sets.pop();
      this.renderRoutineEditorExercises();
    }
  },

  toggleSetType(exIdx, setIdx) {
    const set = this.activeEditingRoutine.exercises[exIdx].sets[setIdx];
    const types = ['Normal', 'Warmup', 'Dropset', 'Failure'];
    let nextIdx = (types.indexOf(set.type) + 1) % types.length;
    set.type = types[nextIdx];
    this.renderRoutineEditorExercises();
  },

  updateSet(exIdx, setIdx, field, val) {
    this.activeEditingRoutine.exercises[exIdx].sets[setIdx][field] = val ? parseFloat(val) : '';
  },

  async saveRoutine() {
    const name = document.getElementById('rem-name').value.trim();
    const notes = document.getElementById('rem-notes').value.trim();

    if (!name) {
      alert("Please enter a routine name.");
      return;
    }

    if (this.activeEditingRoutine.exercises.length === 0) {
      alert("Please add at least one exercise to save the routine template.");
      return;
    }

    this.activeEditingRoutine.name = name;
    this.activeEditingRoutine.notes = notes;

    await dbHelper.saveRoutine(this.activeEditingRoutine);
    modalManager.close('routine-editor-modal');
    this.render();
  },

  async deleteRoutine(id) {
    if (confirm("Are you sure you want to delete this routine template?")) {
      await dbHelper.deleteRoutine(id);
      this.render();
    }
  },

  // Start active workout utilizing routine template structure
  async startRoutine(routineId) {
    const r = this.routines.find(item => item.id === routineId);
    if (!r) return;

    workoutManager.startRoutineWorkout(r);
  }
};

// ==========================================
// Workout Logger Overlay Manager
// ==========================================
const workoutManager = {
  activeWorkout: null,
  timerInterval: null,
  restInterval: null,
  restRemaining: 0,
  restTotal: 0,

  startEmptyWorkout() {
    if (this.activeWorkout) {
      if (!confirm("You already have an active workout in progress. Abandon it to start a new one?")) return;
      this.cancelWorkout(true);
    }

    this.activeWorkout = {
      id: null,
      name: 'Empty Workout',
      startTime: new Date(),
      exercises: []
    };

    this.renderLogger();
    this.startTimer();
    this.maximize();
  },

  async startRoutineWorkout(routine) {
    if (this.activeWorkout) {
      if (!confirm("You already have an active workout. Abandon it to start routine?")) return;
      this.cancelWorkout(true);
    }

    // Retrieve previous completed workout values to display as "previous set guidance"
    const history = await dbHelper.getWorkouts();

    const loggedExercises = [];
    
    for (const re of routine.exercises) {
      // Find matching historical sets
      const previousSets = [];
      const pastWorkout = history.find(w => w.exercises.some(e => e.exerciseId === re.exerciseId));
      if (pastWorkout) {
        const found = pastWorkout.exercises.find(e => e.exerciseId === re.exerciseId);
        if (found) previousSets.push(...found.sets);
      }

      // Map routine sets, copy weights/reps, load historical placeholders
      loggedExercises.push({
        exerciseId: re.exerciseId,
        sets: re.sets.map((s, idx) => {
          const prevSet = previousSets[idx];
          return {
            type: s.type || 'Normal',
            weight: s.weight || '',
            reps: s.reps || '',
            completed: false,
            prevWeight: prevSet ? prevSet.weight : null,
            prevReps: prevSet ? prevSet.reps : null
          };
        })
      });
    }

    this.activeWorkout = {
      id: null,
      name: routine.name,
      startTime: new Date(),
      exercises: loggedExercises
    };

    this.renderLogger();
    this.startTimer();
    this.maximize();
  },

  maximize() {
    const sheet = document.getElementById('active-workout-sheet');
    sheet.classList.remove('minimized');
    sheet.classList.add('active');
  },

  minimize() {
    const sheet = document.getElementById('active-workout-sheet');
    sheet.classList.add('minimized');
  },

  startTimer() {
    clearInterval(this.timerInterval);
    const labelMain = document.getElementById('active-workout-timer');
    const labelMini = document.getElementById('mini-timer');
    
    const updateTime = () => {
      const diffMs = new Date() - this.activeWorkout.startTime;
      const totalSec = Math.floor(diffMs / 1000);
      const min = Math.floor(totalSec / 60).toString().padStart(2, '0');
      const sec = (totalSec % 60).toString().padStart(2, '0');
      
      const timeStr = `${min}:${sec}`;
      labelMain.innerText = timeStr;
      labelMini.innerText = timeStr;
    };
    
    updateTime();
    this.timerInterval = setInterval(updateTime, 1000);
  },

  async renderLogger() {
    document.getElementById('active-workout-title').value = this.activeWorkout.name;
    const container = document.getElementById('active-workout-exercises-container');

    if (this.activeWorkout.exercises.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); margin-top: 80px; padding: 0 20px;">
          <i data-lucide="dumbbell" style="width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.4;"></i>
          <p>Add some exercises to your active workout session!</p>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    // Load exercises details
    container.innerHTML = this.activeWorkout.exercises.map((we, exIdx) => {
      const ex = exerciseLibrary.exercises.find(e => e.id === we.exerciseId);
      const name = ex ? ex.name : 'Unknown Exercise';
      const u = settingsManager.units;

      return `
        <div class="workout-exercise-card">
          <div class="wec-header">
            <div>
              <div class="wec-title" onclick="exerciseLibrary.viewDetails('${we.exerciseId}')">${name}</div>
              <span style="font-size: 10px; color: var(--text-secondary);">${ex ? ex.muscleGroup : 'Body'}</span>
            </div>
            <button class="btn btn-sm btn-text" style="color: var(--failure-color);" onclick="workoutManager.removeExercise(${exIdx})">
              <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
          </div>
          <table class="set-table">
            <thead>
              <tr>
                <th style="width: 38px;">Set</th>
                <th>Previous</th>
                <th>${u}</th>
                <th>Reps</th>
                <th style="width: 42px;"><i data-lucide="check" style="width: 14px; height: 14px;"></i></th>
              </tr>
            </thead>
            <tbody>
              ${we.sets.map((s, setIdx) => {
                // Generate previous details label
                let prevLabel = '—';
                if (s.prevWeight !== null && s.prevReps !== null) {
                  prevLabel = `${s.prevWeight} x ${s.prevReps}`;
                }

                return `
                  <tr class="set-row ${s.completed ? 'completed-row' : ''}">
                    <td>
                      <div class="set-num-badge ${s.type}" onclick="workoutManager.toggleSetType(${exIdx}, ${setIdx})">${s.type === 'Normal' ? setIdx + 1 : s.type[0]}</div>
                    </td>
                    <td>
                      <span class="set-prev-label">${prevLabel}</span>
                    </td>
                    <td>
                      <input type="number" class="set-input" value="${s.weight}" placeholder="—" oninput="workoutManager.updateSet(${exIdx}, ${setIdx}, 'weight', this.value)" ${s.completed ? 'disabled' : ''}>
                    </td>
                    <td>
                      <input type="number" class="set-input" value="${s.reps}" placeholder="—" oninput="workoutManager.updateSet(${exIdx}, ${setIdx}, 'reps', this.value)" ${s.completed ? 'disabled' : ''}>
                    </td>
                    <td>
                      <div class="set-checkbox ${s.completed ? 'checked' : ''}" onclick="workoutManager.toggleSetCompletion(${exIdx}, ${setIdx}, this)">
                        <i data-lucide="check" style="width: 14px; height: 14px;"></i>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          <div style="display: flex; gap: 8px; margin-top: 10px;">
            <button class="btn btn-sm btn-text" onclick="workoutManager.addSet(${exIdx})" style="padding: 4px 8px;">+ Add Set</button>
            <button class="btn btn-sm btn-text" style="color: var(--failure-color); padding: 4px 8px;" onclick="workoutManager.removeSet(${exIdx})">- Remove Set</button>
          </div>
        </div>
      `;
    }).join('');
    lucide.createIcons();
  },

  async addExercises(exercises) {
    const history = await dbHelper.getWorkouts();

    for (const ex of exercises) {
      // Find matching historical sets
      const previousSets = [];
      const pastWorkout = history.find(w => w.exercises.some(e => e.exerciseId === ex.id));
      if (pastWorkout) {
        const found = pastWorkout.exercises.find(e => e.exerciseId === ex.id);
        if (found) previousSets.push(...found.sets);
      }

      const defaultWeight = previousSets[0] ? previousSets[0].weight : '';
      const defaultReps = previousSets[0] ? previousSets[0].reps : '';

      this.activeWorkout.exercises.push({
        exerciseId: ex.id,
        sets: [
          {
            type: 'Normal',
            weight: defaultWeight,
            reps: defaultReps,
            completed: false,
            prevWeight: previousSets[0] ? previousSets[0].weight : null,
            prevReps: previousSets[0] ? previousSets[0].reps : null
          }
        ]
      });
    }

    this.renderLogger();
  },

  removeExercise(idx) {
    if (confirm("Are you sure you want to remove this exercise from active workout?")) {
      this.activeWorkout.exercises.splice(idx, 1);
      this.renderLogger();
    }
  },

  addSet(exIdx) {
    const sets = this.activeWorkout.exercises[exIdx].sets;
    const lastSet = sets[sets.length - 1];
    
    // Retrieve previous set weight & reps if available
    let prevWeight = null;
    let prevReps = null;

    // Check if there is historical data for this index
    const exId = this.activeWorkout.exercises[exIdx].exerciseId;
    
    sets.push({
      type: 'Normal',
      weight: lastSet ? lastSet.weight : '',
      reps: lastSet ? lastSet.reps : '',
      completed: false,
      prevWeight: lastSet ? lastSet.prevWeight : null,
      prevReps: lastSet ? lastSet.prevReps : null
    });
    this.renderLogger();
  },

  removeSet(exIdx) {
    const sets = this.activeWorkout.exercises[exIdx].sets;
    if (sets.length > 1) {
      sets.pop();
      this.renderLogger();
    }
  },

  toggleSetType(exIdx, setIdx) {
    const set = this.activeWorkout.exercises[exIdx].sets[setIdx];
    if (set.completed) return; // Disallow changes on completed sets
    const types = ['Normal', 'Warmup', 'Dropset', 'Failure'];
    let nextIdx = (types.indexOf(set.type) + 1) % types.length;
    set.type = types[nextIdx];
    this.renderLogger();
  },

  updateSet(exIdx, setIdx, field, val) {
    this.activeWorkout.exercises[exIdx].sets[setIdx][field] = val !== '' ? parseFloat(val) : '';
  },

  toggleSetCompletion(exIdx, setIdx, checkboxEl) {
    const set = this.activeWorkout.exercises[exIdx].sets[setIdx];
    
    // Ensure weight & reps are inputted before ticking
    if (set.weight === '' || set.reps === '') {
      alert("Please fill in weight and reps values first.");
      return;
    }

    set.completed = !set.completed;
    
    // Smooth haptic tap on mobile
    if (set.completed && 'vibrate' in navigator) {
      navigator.vibrate([15]);
    }

    // Refresh row style immediately without full card redraw to maintain input focus
    const rowEl = checkboxEl.closest('.set-row');
    const weightInput = rowEl.querySelector('input:nth-of-type(1)');
    const repsInput = rowEl.querySelector('input:nth-of-type(2)');

    if (set.completed) {
      rowEl.classList.add('completed-row');
      checkboxEl.classList.add('checked');
      weightInput.disabled = true;
      repsInput.disabled = true;

      // Rest Timer triggers
      this.startRestTimer();
    } else {
      rowEl.classList.remove('completed-row');
      checkboxEl.classList.remove('checked');
      weightInput.disabled = false;
      repsInput.disabled = false;
    }
  },

  // ==========================================
  // Gym Rest Timer Engine
  // ==========================================
  startRestTimer() {
    clearInterval(this.restInterval);
    
    this.restTotal = settingsManager.defaultRestTime;
    this.restRemaining = this.restTotal;

    const banner = document.getElementById('rest-timer-banner');
    const display = document.getElementById('rest-timer-display');
    const progress = document.getElementById('rest-timer-progress');
    
    banner.classList.add('active');

    const updateUI = () => {
      const min = Math.floor(this.restRemaining / 60);
      const sec = (this.restRemaining % 60).toString().padStart(2, '0');
      display.innerText = `${min}:${sec}`;

      // Width indicator
      const perc = (this.restRemaining / this.restTotal) * 100;
      progress.style.width = `${perc}%`;
    };

    updateUI();

    this.restInterval = setInterval(() => {
      this.restRemaining--;
      if (this.restRemaining <= 0) {
        clearInterval(this.restInterval);
        banner.classList.remove('active');
        this.triggerTimerEndEffect();
      } else {
        updateUI();
      }
    }, 1000);
  },

  adjustRest(secs) {
    this.restRemaining = Math.max(0, this.restRemaining + secs);
    this.restTotal = Math.max(1, this.restTotal + secs);
    if (this.restRemaining === 0) {
      clearInterval(this.restInterval);
      document.getElementById('rest-timer-banner').classList.remove('active');
      this.triggerTimerEndEffect();
    }
  },

  skipRest() {
    clearInterval(this.restInterval);
    document.getElementById('rest-timer-banner').classList.remove('active');
  },

  // Premium Web Audio Synthesizer Chime
  triggerTimerEndEffect() {
    // Standard visual toast or vibe
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Tone 1 (Warm High Bell)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain1.gain.setValueAtTime(0, ctx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      // Tone 2 (Harmonic support)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(554.37, ctx.currentTime + 0.15); // C#5
      gain2.gain.setValueAtTime(0, ctx.currentTime + 0.15);
      gain2.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      
      osc1.start();
      osc1.stop(ctx.currentTime + 0.8);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 1.0);
    } catch (err) {
      console.log("Audio Context synthesizer blocked or failed:", err);
    }
  },

  cancelWorkout(silent = false) {
    if (!silent && !confirm("Are you sure you want to cancel and wipe this active workout logs?")) return;

    clearInterval(this.timerInterval);
    clearInterval(this.restInterval);
    
    this.activeWorkout = null;
    document.getElementById('rest-timer-banner').classList.remove('active');
    
    const sheet = document.getElementById('active-workout-sheet');
    sheet.classList.remove('active');
    sheet.classList.remove('minimized');
  },

  async finishWorkout() {
    if (!this.activeWorkout) return;

    // Filter exercises with completed sets only
    const validExercises = [];
    let totalSetsCount = 0;
    let totalVolumeCount = 0;

    this.activeWorkout.exercises.forEach(we => {
      const completedSets = we.sets.filter(s => s.completed);
      if (completedSets.length > 0) {
        validExercises.push({
          exerciseId: we.exerciseId,
          sets: completedSets.map(s => ({
            type: s.type,
            weight: parseFloat(s.weight),
            reps: parseInt(s.reps)
          }))
        });

        completedSets.forEach(s => {
          totalSetsCount++;
          totalVolumeCount += (parseFloat(s.weight) * parseInt(s.reps));
        });
      }
    });

    if (validExercises.length === 0) {
      alert("Please log and check off at least one set to complete and save your workout.");
      return;
    }

    clearInterval(this.timerInterval);
    clearInterval(this.restInterval);
    document.getElementById('rest-timer-banner').classList.remove('active');

    // Create Workout Record
    const name = document.getElementById('active-workout-title').value.trim() || 'Gym Workout';
    const endTime = new Date();
    const durationSec = Math.floor((endTime - this.activeWorkout.startTime) / 1000);

    const workoutRecord = {
      id: 'workout-' + Date.now(),
      name,
      startTime: this.activeWorkout.startTime,
      endTime,
      duration: durationSec,
      exercises: validExercises,
      totalVolume: totalVolumeCount,
      totalSets: totalSetsCount
    };

    await dbHelper.saveWorkout(workoutRecord);
    this.activeWorkout = null;

    // Reset Logger UI
    const sheet = document.getElementById('active-workout-sheet');
    sheet.classList.remove('active');
    sheet.classList.remove('minimized');

    // Display Celebration Screen
    this.triggerCelebration(workoutRecord);
  },

  triggerCelebration(workout) {
    const min = Math.floor(workout.duration / 60);
    const sec = (workout.duration % 60).toString().padStart(2, '0');
    
    document.getElementById('cel-duration').innerText = `${min}:${sec}`;
    document.getElementById('cel-volume').innerText = `${workout.totalVolume.toLocaleString()} ${settingsManager.units}`;
    
    document.getElementById('celebration-screen').classList.add('active');
    
    // Spark heavy vibrate celebration
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100, 50, 300]);
    }
  },

  closeCelebration() {
    document.getElementById('celebration-screen').classList.remove('active');
    router.navigate('profile'); // Re-route to profile dashboard
  }
};

// ==========================================
// Profile Dashboard Calculator Engine
// ==========================================
const dashboardManager = {
  async render() {
    const workouts = await dbHelper.getWorkouts();
    const u = settingsManager.units;

    // Workouts Count
    document.getElementById('stat-workouts').innerText = workouts.length.toString();

    // Volume calculation
    let totalVolume = 0;
    let totalSets = 0;
    workouts.forEach(w => {
      totalVolume += w.totalVolume;
      totalSets += w.totalSets;
    });

    document.getElementById('stat-volume').innerText = `${Math.round(totalVolume).toLocaleString()} ${u}`;
    document.getElementById('stat-sets').innerText = totalSets.toLocaleString();

    this.calculateStreak(workouts);
    this.renderFrequencyGrid(workouts);
  },

  calculateStreak(workouts) {
    const streakDisplay = document.getElementById('profile-streak');
    if (workouts.length === 0) {
      streakDisplay.innerText = "0 Week Streak";
      return;
    }

    // Simplistic Streak Check (Number of consecutive weeks with at least 1 workout)
    // Find active weeks
    const weeksSet = new Set();
    workouts.forEach(w => {
      const d = new Date(w.startTime);
      // Calculate first day of year + week number
      const oneJan = new Date(d.getFullYear(), 0, 1);
      const numberOfDays = Math.floor((d - oneJan) / (24 * 60 * 60 * 1000));
      const weekNum = Math.ceil((d.getDay() + 1 + numberOfDays) / 7);
      weeksSet.add(`${d.getFullYear()}-w${weekNum}`);
    });

    const streakCount = weeksSet.size;
    streakDisplay.innerText = `${streakCount} Week${streakCount === 1 ? '' : 's'} Active`;
  },

  renderFrequencyGrid(workouts) {
    const container = document.getElementById('freq-calendar-container');
    container.innerHTML = '';

    // Day Labels
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    days.forEach(day => {
      const el = document.createElement('div');
      el.className = 'freq-day-lbl';
      el.innerText = day;
      container.appendChild(el);
    });

    // Populate past 7 days cells
    const now = new Date();
    const dotsList = [];

    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(now.getDate() - i);
      
      const isToday = targetDate.toDateString() === now.toDateString();
      
      // Determine if a workout fell on this day
      const completedOnDay = workouts.some(w => {
        const wDate = new Date(w.startTime);
        return wDate.toDateString() === targetDate.toDateString();
      });

      dotsList.push({
        num: targetDate.getDate(),
        isToday,
        completed: completedOnDay
      });
    }

    dotsList.forEach(dot => {
      const el = document.createElement('div');
      el.className = `freq-dot ${dot.completed ? 'completed' : ''} ${dot.isToday ? 'today' : ''}`;
      el.innerText = dot.num;
      container.appendChild(el);
    });
  }
};

// ==========================================
// Training Log History List Controller
// ==========================================
const historyManager = {
  async render() {
    const workouts = await dbHelper.getWorkouts();
    const container = document.getElementById('history-list-container');
    const u = settingsManager.units;

    if (workouts.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 48px 0;">
          <i data-lucide="history" style="width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.4;"></i>
          <p>No logged workouts in history. Start lifting!</p>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    container.innerHTML = workouts.map(w => {
      const d = new Date(w.startTime);
      const dateStr = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      
      const durationMin = Math.round(w.duration / 60);

      return `
        <div class="history-item" onclick="historyManager.viewDetails('${w.id}')">
          <div class="history-item-header">
            <div>
              <div class="history-item-title">${w.name}</div>
              <div class="history-item-date">${dateStr}</div>
            </div>
            <button class="btn btn-sm btn-text" style="color: var(--failure-color); padding: 2px 6px;" onclick="event.stopPropagation(); historyManager.deleteLog('${w.id}')">
              <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
          </div>
          
          <div class="history-item-meta">
            <span>Time: <strong>${durationMin}m</strong></span>
            <span>Vol: <strong>${Math.round(w.totalVolume).toLocaleString()} ${u}</strong></span>
            <span>Sets: <strong>${w.totalSets}</strong></span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 4px;">
            ${w.exercises.slice(0, 3).map(we => {
              const ex = exerciseLibrary.exercises.find(e => e.id === we.exerciseId);
              const name = ex ? ex.name : 'Unknown Exercise';
              return `
                <div class="history-exercise-line">
                  <strong>${we.sets.length}x</strong> ${name}
                </div>
              `;
            }).join('')}
            ${w.exercises.length > 3 ? `<div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">+ ${w.exercises.length - 3} more exercises</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
    lucide.createIcons();
  },

  async viewDetails(workoutId) {
    const workouts = await dbHelper.getWorkouts();
    const w = workouts.find(item => item.id === workoutId);
    if (!w) return;

    // Since we want to show standard detail, let's open custom display inside a modular window
    // For extreme simplicity, we can load this in the active workout logger overlay BUT as a read-only viewer!
    // To do this, let's render a custom view popup
    const exListLines = w.exercises.map(we => {
      const ex = exerciseLibrary.exercises.find(e => e.id === we.exerciseId);
      const name = ex ? ex.name : 'Unknown Exercise';
      const setsLines = we.sets.map((s, idx) => `
        <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px;">
          <span style="color: var(--text-secondary)">Set ${idx + 1} (${s.type})</span>
          <strong>${s.weight} ${settingsManager.units} x ${s.reps} reps</strong>
        </div>
      `).join('');

      return `
        <div class="workout-exercise-card" style="margin-bottom: 12px;">
          <div class="wec-header" style="margin-bottom: 8px;">
            <div class="wec-title" style="font-size: 14px;">${name}</div>
          </div>
          ${setsLines}
        </div>
      `;
    }).join('');

    const edm = document.getElementById('exercise-detail-modal');
    document.getElementById('edm-title').innerText = w.name;
    
    const prsContainer = document.getElementById('edm-prs-container');
    const u = settingsManager.units;
    const durationMin = Math.round(w.duration / 60);
    prsContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; font-size: 13px;">
        <span style="color: var(--text-secondary)">Workout Volume:</span>
        <strong>${w.totalVolume.toLocaleString()} ${u}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 13px;">
        <span style="color: var(--text-secondary)">Workout Duration:</span>
        <strong>${durationMin} minutes</strong>
      </div>
    `;

    const histContainer = document.getElementById('edm-history-container');
    histContainer.innerHTML = `
      <div class="section-title" style="font-size: 14px; margin-top: 8px; margin-bottom: 8px;">Exercises Logged</div>
      ${exListLines}
    `;

    modalManager.open('exercise-detail-modal');
  },

  async deleteLog(workoutId) {
    if (confirm("Are you sure you want to permanently delete this workout log from your history?")) {
      await dbHelper.deleteWorkout(workoutId);
      this.render();
      dashboardManager.render(); // Redraw dashboard stats
    }
  }
};

// ==========================================
// Application Initializer Orchestrator
// ==========================================
async function initApplication() {
  // 1. Initialise Settings
  await settingsManager.init();

  // 2. Cache & pre-load Exercise Library Array
  await exerciseLibrary.load();

  // 3. Fire SPA Router Initial State
  router.init();

  // 4. Initialise custom icons
  lucide.createIcons();
}

// Fire application initialization on load
window.addEventListener('DOMContentLoaded', () => {
  initApplication();
});
