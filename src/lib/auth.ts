
import { auth } from "@/lib/firebaseAdmin";

export async function verifySession(sessionCookie: string) {
  if (!sessionCookie) {
    return null;
  }
  try {
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    return decodedClaims;
  } catch (error) {
    return null;
  }
}
