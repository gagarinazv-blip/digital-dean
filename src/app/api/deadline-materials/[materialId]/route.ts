import {
  authorizeStudentRequest,
  privateHeaders,
  privateNotFound,
} from "@/lib/api-student";
import { getStudentDeadlineMaterialFile } from "@/lib/deadline-data";

// Остальные типы всегда скачиваются: браузер не должен исполнять чужой файл.
const INLINE_MEDIA_TYPES = new Set(["application/pdf"]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ materialId: string }> },
): Promise<Response> {
  const studentId = await authorizeStudentRequest();
  if (typeof studentId !== "number") return studentId;

  const { materialId } = await params;
  const material = await getStudentDeadlineMaterialFile(materialId, studentId);
  if (!material?.data) return privateNotFound();

  const mediaType = material.mediaType ?? "application/octet-stream";
  const fileName = material.fileName ?? "material";
  const inline =
    INLINE_MEDIA_TYPES.has(mediaType) &&
    new URL(request.url).searchParams.get("download") !== "1";
  const fallbackName = fileName
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");
  const encodedName = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  const data = new Uint8Array(material.data);

  return new Response(data, {
    headers: {
      ...privateHeaders,
      "Content-Type": mediaType,
      "Content-Length": String(data.byteLength),
      "Content-Disposition": `${
        inline ? "inline" : "attachment"
      }; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`,
    },
  });
}
