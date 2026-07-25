import { redirect } from "next/navigation";

/** App entry point: always start on the login / welcome screen */
export default function IndexPage() {
  redirect("/login");
}
