import { getDb } from "@/db/client";
import { alertHeaders, checkCoverage, sendCoverageAlert } from "@/server/alerting";
import { isAlertAuthorized } from "@/server/editorAuth";
import { withErrorCapture } from "@/server/withErrorCapture";

export const dynamic = "force-dynamic";

/**
 * Missing-puzzle alert, designed to be called by something outside the app: a
 * cron job, an uptime pinger, or a CI schedule.
 *
 * Point it at this URL once a day with `x-guessee-key`, and alert on the
 * `x-guessee-coverage: missing_puzzles` header or on `status` in the body. A
 * 200 is always returned: an uncovered day is a content problem to report, not
 * a broken endpoint. If GUESSEE_ALERT_WEBHOOK is set, the alert is also posted
 * there so a human hears about it.
 */
export const GET = withErrorCapture("api.alerts.coverage", async (request: Request) => {
  if (!isAlertAuthorized(request)) {
    return Response.json({ error: "Alert key required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const daysParam = Number(url.searchParams.get("days"));
  const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 60) : undefined;

  const alert = checkCoverage(getDb(), { days });

  const delivered = await sendCoverageAlert(process.env.GUESSEE_ALERT_WEBHOOK, alert).catch(
    (error: unknown) => ({
      sent: false as const,
      error: error instanceof Error ? error.message : "Webhook failed",
    }),
  );

  return Response.json(
    { ...alert, webhook: delivered },
    { headers: { ...alertHeaders(alert), "cache-control": "no-store" } },
  );
});
