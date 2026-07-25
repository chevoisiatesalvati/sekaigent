import { redirect } from "next/navigation";

/** Legacy Agent Studio route → Squad. */
export default function AgentsRedirectPage() {
  redirect("/squad");
}
