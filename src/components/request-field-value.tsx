type FieldAttachment = {
  id: number;
  fieldKey: string | null;
  fileName: string;
};

// Значение поля заявки; загруженный в поле файл показываем ссылкой.
export function RequestFieldValue({
  entry,
  attachments,
}: {
  entry: { id: string; value: string; kind: string };
  attachments: readonly FieldAttachment[];
}) {
  const file =
    entry.kind === "file"
      ? attachments.find((attachment) => attachment.fieldKey === entry.id)
      : undefined;
  if (!file) return entry.value;
  return (
    <a download href={`/api/request-attachments/${file.id}`}>
      {file.fileName}
    </a>
  );
}
