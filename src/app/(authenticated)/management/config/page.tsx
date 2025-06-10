import { redirect } from "next/navigation";

export default function ConfigIndexPage() {
  redirect("/management/config/site");
}
