import { redirect } from "next/navigation";

/** proxy에서 / → /login|/app 로 보냄. 이 페이지는 안전망. */
export const instant = false;

export default function Home() {
  redirect("/login");
}
