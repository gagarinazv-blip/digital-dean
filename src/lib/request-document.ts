type RequestDocumentData = {
  requestId: string;
  title: string;
  issuedAt: Date;
  profileEntries: readonly { label: string; value: string }[];
  formEntries: readonly { label: string; value: string }[];
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderEntries(
  entries: readonly { label: string; value: string }[],
): string {
  return entries
    .map(
      ({ label, value }) =>
        `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`,
    )
    .join("");
}

export function renderRequestDocumentHtml({
  requestId,
  title,
  issuedAt,
  profileEntries,
  formEntries,
}: RequestDocumentData): string {
  const date = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
    timeZone: "Europe/Moscow",
  }).format(issuedAt);

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Демонстрационный документ — ${escapeHtml(title)}</title>
  <style>
    body{max-width:760px;margin:48px auto;padding:32px;color:#292526;font:16px/1.6 Arial,sans-serif}
    .demo{display:inline-block;padding:6px 12px;border:1px solid #8a1f3d;border-radius:20px;color:#8a1f3d;font-weight:700}
    h1{margin-top:32px;text-align:center;font-size:26px}
    .muted{color:#696365}
    table{width:100%;margin:24px 0;border-collapse:collapse}
    th,td{padding:10px 12px;border:1px solid #ded9da;text-align:left;vertical-align:top}
    th{width:38%;background:#f7f4f4}
    @media print{body{margin:0 auto;padding:0}.demo{border-color:#8a1f3d}}
  </style>
</head>
<body>
  <span class="demo">ДЕМО · НЕ ЯВЛЯЕТСЯ ОФИЦИАЛЬНЫМ ДОКУМЕНТОМ</span>
  <h1>${escapeHtml(title)}</h1>
  <p>Документ сформирован в демонстрационной версии личного кабинета.</p>
  <p class="muted">Заявка №${escapeHtml(requestId)} · ${escapeHtml(date)}</p>
  <h2>Сведения заявителя</h2>
  <table><tbody>${renderEntries(profileEntries)}</tbody></table>
  ${
    formEntries.length > 0
      ? `<h2>Сведения из заявления</h2><table><tbody>${renderEntries(formEntries)}</tbody></table>`
      : ""
  }
  <p class="muted">Документ создан для демонстрации интерфейса и не имеет юридической силы.</p>
</body>
</html>`;
}
