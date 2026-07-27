import { redirect } from "next/navigation";
import { isLoginBypassEnabled } from "@/lib/preview-auth";

/** App entry: login normally; Home when preview bypass is enabled */
export default function IndexPage() {
  if (isLoginBypassEnabled()) {
    redirect("/home");
  }
  redirect("/login");
}
