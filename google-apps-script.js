/**
 * Hevy PWA Google Apps Script Sync Engine (Version 2)
 * 
 * INSTRUCTIONS:
 * 1. Open your browser and go to your "Hevy Database" Google Sheet.
 * 2. Go to Extensions > Apps Script in the top menu.
 * 3. Clear any existing code, and paste this entire script.
 * 4. Save and Redeploy: Deploy > Manage deployments > Edit > Version: New version > Deploy.
 */

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Create Workouts Sheet if it doesn't exist
  let workoutsSheet = ss.getSheetByName("Workouts");
  if (!workoutsSheet) {
    workoutsSheet = ss.insertSheet("Workouts");
    // Write Headers
    workoutsSheet.appendRow(["Workout ID", "Date Completed", "Workout Name", "Duration (sec)", "Total Volume", "Total Sets", "Exercises Data (JSON)"]);
    workoutsSheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#0c0c0e").setFontColor("#ffffff");
    workoutsSheet.setFrozenRows(1);
  }
  
  // 2. Create BodyWeight Sheet if it doesn't exist
  let weightSheet = ss.getSheetByName("BodyWeight");
  if (!weightSheet) {
    weightSheet = ss.insertSheet("BodyWeight");
    // Write Headers
    weightSheet.appendRow(["Log ID", "Date", "Weight", "Notes"]);
    weightSheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#0c0c0e").setFontColor("#ffffff");
    weightSheet.setFrozenRows(1);
  }
  
  // 3. Create Calories Sheet if it doesn't exist
  let caloriesSheet = ss.getSheetByName("Calories");
  if (!caloriesSheet) {
    caloriesSheet = ss.insertSheet("Calories");
    // Write Headers
    caloriesSheet.appendRow(["Log ID", "Date", "Calories"]);
    caloriesSheet.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#0c0c0e").setFontColor("#ffffff");
    caloriesSheet.setFrozenRows(1);
  }
  
  // 4. Create BodyFat Sheet if it doesn't exist
  let bodyfatSheet = ss.getSheetByName("BodyFat");
  if (!bodyfatSheet) {
    bodyfatSheet = ss.insertSheet("BodyFat");
    // Write Headers
    bodyfatSheet.appendRow(["Log ID", "Date", "Body Fat %"]);
    bodyfatSheet.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#0c0c0e").setFontColor("#ffffff");
    bodyfatSheet.setFrozenRows(1);
  }
}

// Handle GET Requests - Retrieve all data from Google Sheets to sync back to phone
function doGet(e) {
  setupDatabase();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Read Workouts
  const workoutsSheet = ss.getSheetByName("Workouts");
  const workoutsData = workoutsSheet.getDataRange().getValues();
  const workouts = [];
  for (let i = 1; i < workoutsData.length; i++) {
    const row = workoutsData[i];
    try {
      workouts.push({
        id: row[0].toString(),
        startTime: new Date(row[1]).toISOString(),
        endTime: new Date(row[1]).toISOString(), // Approximate
        name: row[2].toString(),
        duration: parseInt(row[3]) || 0,
        totalVolume: parseFloat(row[4]) || 0,
        totalSets: parseInt(row[5]) || 0,
        exercises: JSON.parse(row[6])
      });
    } catch (err) { /* Skip invalid rows silently */ }
  }
  
  // Read Bodyweight logs
  const weightSheet = ss.getSheetByName("BodyWeight");
  const weightData = weightSheet.getDataRange().getValues();
  const weightLogs = [];
  for (let i = 1; i < weightData.length; i++) {
    const row = weightData[i];
    if (!row[0] || !row[1]) continue; // Skip empty rows
    try {
      weightLogs.push({
        id: row[0].toString(),
        date: new Date(row[1]).toISOString(),
        weight: parseFloat(row[2]) || 0,
        notes: row[3] ? row[3].toString() : ""
      });
    } catch (err) { /* Skip invalid rows silently */ }
  }
  
  // Read Calories logs
  const caloriesSheet = ss.getSheetByName("Calories");
  const caloriesData = caloriesSheet.getDataRange().getValues();
  const caloriesLogs = [];
  for (let i = 1; i < caloriesData.length; i++) {
    const row = caloriesData[i];
    if (!row[0] || !row[1]) continue;
    try {
      caloriesLogs.push({
        id: row[0].toString(),
        date: new Date(row[1]).toISOString(),
        calories: parseInt(row[2]) || 0
      });
    } catch (err) { /* Skip invalid rows silently */ }
  }
  
  // Read Body Fat logs
  const bodyfatSheet = ss.getSheetByName("BodyFat");
  const bodyfatData = bodyfatSheet.getDataRange().getValues();
  const bodyfatLogs = [];
  for (let i = 1; i < bodyfatData.length; i++) {
    const row = bodyfatData[i];
    if (!row[0] || !row[1]) continue;
    try {
      bodyfatLogs.push({
        id: row[0].toString(),
        date: new Date(row[1]).toISOString(),
        fatPercent: parseFloat(row[2]) || 0
      });
    } catch (err) { /* Skip invalid rows silently */ }
  }
  
  const payload = {
    success: true,
    workouts: workouts,
    bodyweight: weightLogs,
    nutrition: caloriesLogs,
    bodyfat: bodyfatLogs
  };
  
  return ContentService.createTextOutput(JSON.stringify(payload))
                       .setMimeType(ContentService.MimeType.TEXT);
}

// Handle POST Requests - Upload and upsert pending logs from phone
function doPost(e) {
  setupDatabase();
  
  let postData;
  try {
    postData = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Invalid JSON body" }))
                         .setMimeType(ContentService.MimeType.TEXT);
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const action = postData.action;
  
  if (action === "sync") {
    const workoutsToSync = postData.workouts || [];
    const weightsToSync = postData.bodyweight || [];
    const caloriesToSync = postData.nutrition || [];
    const bodyfatToSync = postData.bodyfat || [];
    
    // 1. Sync Workouts
    if (workoutsToSync.length > 0) {
      const workoutsSheet = ss.getSheetByName("Workouts");
      const workoutsRows = workoutsSheet.getDataRange().getValues();
      
      workoutsToSync.forEach(w => {
        let rowIdx = -1;
        for (let i = 1; i < workoutsRows.length; i++) {
          if (workoutsRows[i][0].toString() === w.id.toString()) {
            rowIdx = i + 1;
            break;
          }
        }
        
        const rowData = [
          w.id.toString(),
          new Date(w.startTime).toISOString(),
          w.name.toString(),
          parseInt(w.duration) || 0,
          parseFloat(w.totalVolume) || 0,
          parseInt(w.totalSets) || 0,
          JSON.stringify(w.exercises)
        ];
        
        if (rowIdx !== -1) {
          workoutsSheet.getRange(rowIdx, 1, 1, 7).setValues([rowData]);
        } else {
          workoutsSheet.appendRow(rowData);
        }
      });
    }
    
    // 2. Sync BodyWeight Logs
    if (weightsToSync.length > 0) {
      const weightSheet = ss.getSheetByName("BodyWeight");
      const weightRows = weightSheet.getDataRange().getValues();
      
      weightsToSync.forEach(log => {
        let rowIdx = -1;
        for (let i = 1; i < weightRows.length; i++) {
          if (weightRows[i][0].toString() === log.id.toString()) {
            rowIdx = i + 1;
            break;
          }
        }
        
        const rowData = [
          log.id.toString(),
          new Date(log.date).toISOString(),
          parseFloat(log.weight) || 0,
          log.notes ? log.notes.toString() : ""
        ];
        
        if (rowIdx !== -1) {
          weightSheet.getRange(rowIdx, 1, 1, 4).setValues([rowData]);
        } else {
          weightSheet.appendRow(rowData);
        }
      });
    }
    
    // 3. Sync Calories Logs
    if (caloriesToSync.length > 0) {
      const caloriesSheet = ss.getSheetByName("Calories");
      const caloriesRows = caloriesSheet.getDataRange().getValues();
      
      caloriesToSync.forEach(log => {
        let rowIdx = -1;
        for (let i = 1; i < caloriesRows.length; i++) {
          if (caloriesRows[i][0].toString() === log.id.toString()) {
            rowIdx = i + 1;
            break;
          }
        }
        
        const rowData = [
          log.id.toString(),
          new Date(log.date).toISOString(),
          parseInt(log.calories) || 0
        ];
        
        if (rowIdx !== -1) {
          caloriesSheet.getRange(rowIdx, 1, 1, 3).setValues([rowData]);
        } else {
          caloriesSheet.appendRow(rowData);
        }
      });
    }
    
    // 4. Sync BodyFat Logs
    if (bodyfatToSync.length > 0) {
      const bodyfatSheet = ss.getSheetByName("BodyFat");
      const bodyfatRows = bodyfatSheet.getDataRange().getValues();
      
      bodyfatToSync.forEach(log => {
        let rowIdx = -1;
        for (let i = 1; i < bodyfatRows.length; i++) {
          if (bodyfatRows[i][0].toString() === log.id.toString()) {
            rowIdx = i + 1;
            break;
          }
        }
        
        const rowData = [
          log.id.toString(),
          new Date(log.date).toISOString(),
          parseFloat(log.fatPercent) || 0
        ];
        
        if (rowIdx !== -1) {
          bodyfatSheet.getRange(rowIdx, 1, 1, 3).setValues([rowData]);
        } else {
          bodyfatSheet.appendRow(rowData);
        }
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
                         .setMimeType(ContentService.MimeType.TEXT);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Unknown action" }))
                       .setMimeType(ContentService.MimeType.TEXT);
}
