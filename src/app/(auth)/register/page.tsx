
import { redirect } from "next/navigation";

export default function RegisterPage() {
  // Registration is disabled per user request
  redirect("/");
  return null;
}
