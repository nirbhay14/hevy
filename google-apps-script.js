/**
 * Hevy PWA Google Apps Script Sync Engine
 * 
 * INSTRUCTIONS:
 * 1. Go to Google Drive (https://drive.google.com).
 * 2. Create a new Google Sheet named "Hevy Database".
 * 3. In the Google Sheet, go to Extensions > Apps Script in the top menu.
 * 4. Clear any existing code in the editor, and paste this entire script.
 * 5. Click Save (the floppy disk icon) or press Cmd+S / Ctrl+S.
 * 6. Click "Deploy" (blue button in top right) > "New deployment".
 * 7. Click the gear icon next to "Select type" and select "Web app".
 * 8. Set the configuration as follows:
 *    - Description: Hevy Sync API
 *    - Execute as: "Me" (your-email@gmail.com)
 *    - Who has access: "Anyone" (This is required so your phone can send data securely).
 * 9. Click "Deploy".
 * 10. Copy the generated "Web app URL" (it will end in "/exec") and paste it into the 
 *     Cloud Sync Settings inside your Hevy app!
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
    } catch (err) {
      // Skip invalid rows silently
    }
  }
  
  // Read Bodyweight logs
  const weightSheet = ss.getSheetByName("BodyWeight");
  const weightData = weightSheet.getDataRange().getValues();
  const weightLogs = [];
  for (let i = 1; i < weightData.length; i++) {
    const row = weightData[i];
    weightLogs.push({
      id: row[0].toString(),
      date: new Date(row[1]).toISOString(),
      weight: parseFloat(row[2]) || 0,
      notes: row[3] ? row[3].toString() : ""
    });
  }
  
  const payload = {
    success: true,
    workouts: workouts,
    bodyweight: weightLogs
  };
  
  return ContentService.createTextOutput(JSON.stringify(payload))
                       .setMimeType(ContentService.MimeType.JSON);
}

// Handle POST Requests - Upload and upsert pending logs from phone
function doPost(e) {
  setupDatabase();
  
  let postData;
  try {
    postData = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Invalid JSON body" }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const action = postData.action;
  
  if (action === "sync") {
    const workoutsToSync = postData.workouts || [];
    const weightsToSync = postData.bodyweight || [];
    
    // 1. Sync Workouts
    if (workoutsToSync.length > 0) {
      const workoutsSheet = ss.getSheetByName("Workouts");
      const workoutsRows = workoutsSheet.getDataRange().getValues();
      
      workoutsToSync.forEach(w => {
        // Search if workout ID already exists to avoid duplication (Upsert)
        let rowIdx = -1;
        for (let i = 1; i < workoutsRows.length; i++) {
          if (workoutsRows[i][0].toString() === w.id.toString()) {
            rowIdx = i + 1; // 1-indexed for sheet access (+1 for header row)
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
          // Overwrite existing row
          workoutsSheet.getRange(rowIdx, 1, 1, 7).setValues([rowData]);
        } else {
          // Append new row
          workoutsSheet.appendRow(rowData);
        }
      });
    }
    
    // 2. Sync BodyWeight Logs
    if (weightsToSync.length > 0) {
      const weightSheet = ss.getSheetByName("BodyWeight");
      const weightRows = weightSheet.getDataRange().getValues();
      
      weightsToSync.forEach(log => {
        // Search if Weight Log ID already exists (Upsert)
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
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Unknown action" }))
                       .setMimeType(ContentService.MimeType.JSON);
}
