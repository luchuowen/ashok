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

export const measurements: ClientMeasurements[] = [
  {
    id: "meas-wanjiru-kamau-01",
    clientId: "client-wanjiru-kamau",
    clientName: "Wanjiru Kamau",
    takenAt: "2026-07-14",
    chest: 96,
    waist: 84,
    hips: 98,
    shoulder: 45,
    sleeveLength: 63,
    inseam: 81,
    neck: 39,
    // TODO: placeholder note pending the House's real fitting-session record
    notes: "Slight forward shoulder tilt; ease the left sleeve head by 0.5cm.",
  },
];
