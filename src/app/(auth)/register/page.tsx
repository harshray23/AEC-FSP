
import { redirect } from "next/navigation";

export default function RegisterPage() {
  // Registration is disabled as requested.
  // Directing users back to the landing page.
  redirect("/");
  return null;
}
