import { Student, SchoolSettings, AccessLog } from '../types';

/**
 * Service to handle integration with Google Sheets via Google Apps Script Web App URL.
 * Provides functions to fetch all data from Google Sheets and sync all local data back.
 */

// Helper to check if Sheets Sync is configured
export function isSheetsSyncConfigured(settings: SchoolSettings | null): boolean {
  return !!(settings && settings.sheetsSyncEnabled && settings.sheetsWebAppUrl && settings.sheetsWebAppUrl.trim().startsWith('https://script.google.com'));
}

// Fetch all data from Google Sheets
export async function fetchAllFromSheets(webAppUrl: string): Promise<{
  students: Student[];
  schoolSettings: Partial<SchoolSettings>;
  kkm: number;
  accessLogs: AccessLog[];
} | null> {
  try {
    const cleanUrl = webAppUrl.trim();
    // Google Apps Script requires a redirect, fetch handles this natively
    const response = await fetch(`${cleanUrl}?action=read_all`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (result && result.success) {
      return {
        students: result.data.students || [],
        schoolSettings: result.data.schoolSettings || {},
        kkm: Number(result.data.kkm) || 75,
        accessLogs: result.data.accessLogs || [],
      };
    }
    throw new Error(result?.message || 'Gagal membaca data dari Google Sheets.');
  } catch (error) {
    console.error('Error fetching from Sheets:', error);
    throw error;
  }
}

// Sync all local data back to Google Sheets
export async function syncAllToSheets(
  webAppUrl: string,
  data: {
    students: Student[];
    schoolSettings: SchoolSettings;
    kkm: number;
    accessLogs: AccessLog[];
  }
): Promise<boolean> {
  try {
    const cleanUrl = webAppUrl.trim();
    
    // We use a POST request with redirect mode for Google Apps Script Web App
    const response = await fetch(cleanUrl, {
      method: 'POST',
      mode: 'no-cors', // Apps Script does not return CORS headers for redirect, 'no-cors' lets the request complete
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'sync_all',
        payload: data,
      }),
    });

    // Note: With 'no-cors', response.ok is false and response.status is 0, but the request successfully hits the server
    return true;
  } catch (error) {
    console.error('Error syncing to Sheets:', error);
    throw error;
  }
}

// Helper to push a single Access Log to Sheets
export async function pushLogToSheets(webAppUrl: string, log: AccessLog): Promise<boolean> {
  try {
    const cleanUrl = webAppUrl.trim();
    await fetch(cleanUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'add_log',
        payload: log,
      }),
    });
    return true;
  } catch (error) {
    console.error('Error pushing log to Sheets:', error);
    return false;
  }
}
