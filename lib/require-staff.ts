import { cookies } from "next/headers";
import { STAFF_SESSION_COOKIE, verifyStaffSessionToken } from "@/lib/staff-auth";

export function isStaffAuthed(): boolean {
  const token = cookies().get(STAFF_SESSION_COOKIE)?.value;
  return verifyStaffSessionToken(token);
}
