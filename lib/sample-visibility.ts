import { cookies } from "next/headers";
import { applyDataView, resolveView, VIEW_COOKIE, type DataView } from "@/lib/data-view";
import { SAMPLE_COOKIE } from "@/lib/sample-cookie";

export { applyDataView };

/** The data view for this request, from the user's saved choice. */
export async function getDataView(hasRealMail: boolean): Promise<DataView> {
  const jar = await cookies();
  return resolveView(jar.get(VIEW_COOKIE)?.value, jar.get(SAMPLE_COOKIE)?.value, hasRealMail);
}
