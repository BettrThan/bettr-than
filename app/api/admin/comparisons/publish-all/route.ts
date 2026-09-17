import { requireAdminApi } from "@/lib/admin-auth";
import { publishAllEligibleHeadphoneComparisons } from "@/lib/launch-catalog";

export async function POST(request: Request) {
  const auth = await requireAdminApi(request);
  if ("error" in auth) return auth.error;
  try {
    const result = await publishAllEligibleHeadphoneComparisons(auth.user.userId);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to publish eligible comparisons." }, { status: 422 });
  }
}
