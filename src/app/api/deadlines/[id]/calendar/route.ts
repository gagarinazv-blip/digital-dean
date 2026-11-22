import {
  authorizeStudentRequest,
  privateHeaders,
  privateNotFound,
} from "@/lib/api-student";
import { cleanStudentFacingText } from "@/lib/campus-labels";
import { getStudentDeadline } from "@/lib/deadline-data";
import { generateDeadlineIcs } from "@/lib/deadline-ics";
import { getDemoNow } from "@/lib/demo-date";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const studentId = await authorizeStudentRequest();
  if (typeof studentId !== "number") return studentId;

  const { id } = await params;
  const deadline = await getStudentDeadline(id, studentId);
  if (!deadline) return privateNotFound();

  const withReminder =
    new URL(request.url).searchParams.get("reminder") === "1";
  const content = generateDeadlineIcs(
    {
      ...deadline,
      title: cleanStudentFacingText(deadline.title),
      subject: cleanStudentFacingText(deadline.subject),
    },
    getDemoNow(),
    { withReminder },
  );
  return new Response(content, {
    headers: {
      ...privateHeaders,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${
        withReminder ? "deadline-reminder" : "deadline"
      }.ics"`,
    },
  });
}
