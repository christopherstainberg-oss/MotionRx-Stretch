import { redirect } from "next/navigation";

/** Legacy route: Assess renamed to Assessment */
export default function AssessRedirectPage() {
  redirect("/assessment");
}
