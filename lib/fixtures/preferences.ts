/** Client style preferences. Field names mirror the eventual `preferences` Firestore collection. */

export interface ClientPreferences {
  clientId: string;
  clientName: string;
  fitPreference: "Slim" | "Classic" | "Relaxed";
  preferredFabricWeight: string;
  lapelStyle: "Notch" | "Peak" | "Shawl";
  communicationChannel: "WhatsApp" | "Email" | "Phone";
  notes: string;
}

export const preferences: ClientPreferences[] = [];
