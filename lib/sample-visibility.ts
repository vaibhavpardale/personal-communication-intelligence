import { cookies } from "next/headers";
import { SAMPLE_COOKIE } from "@/lib/sample-cookie";

/** Explicit choice (cookie) wins; otherwise show samples only while there is no real Gmail mail. */
export async function shouldShowSample(hasGmail: boolean): Promise<boolean> {
  const value = (await cookies()).get(SAMPLE_COOKIE)?.value;
  if (value === "1") return true;
  if (value === "0") return false;
  return !hasGmail;
}
