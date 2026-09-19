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

export const preferences: ClientPreferences[] = [
  {
    clientId: "client-wanjiru-kamau",
    clientName: "Wanjiru Kamau",
    fitPreference: "Classic",
    preferredFabricWeight: "260–300g/m²",
    lapelStyle: "Peak",
    communicationChannel: "WhatsApp",
    // TODO: placeholder note pending the House's real client preferences file
    notes: "Prefers surgeon's cuffs, functional buttonholes.",
  },
];
