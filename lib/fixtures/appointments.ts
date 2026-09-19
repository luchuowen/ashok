/** Client appointments. Field names mirror the eventual `appointments` Firestore collection. */

export type AppointmentType = "Consultation" | "Measurement" | "Fitting";
export type AppointmentStatus = "Scheduled" | "Completed" | "Cancelled";

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  type: AppointmentType;
  date: string; // ISO date
  time: string; // e.g. "14:30"
  location: string;
  status: AppointmentStatus;
}

export const appointments: Appointment[] = [];
