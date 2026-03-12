
import { auth } from "@/lib/firebaseAdmin";

export async function verifySession(sessionCookie: string) {
  if (!sessionCookie || !auth) {
    return null;
  }
  try {
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    return decodedClaims;
  } catch (error) {
    console.error("Session verification failed:", error);
    return null;
  }
}
