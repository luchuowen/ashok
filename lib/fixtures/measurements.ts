/** Client measurement records. Field names mirror the eventual `measurements` Firestore collection. */

export interface ClientMeasurements {
  id: string;
  clientId: string;
  clientName: string;
  takenAt: string; // ISO date
  // all in cm
  chest: number;
  waist: number;
  hips: number;
  shoulder: number;
  sleeveLength: number;
  inseam: number;
  neck: number;
  notes: string;
}

export const measurements: ClientMeasurements[] = [];
