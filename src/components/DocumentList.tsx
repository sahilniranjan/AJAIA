import Link from "next/link";
import type { ReactNode } from "react";
import { formatRelativeTime } from "@/lib/relative-time";
import type { OwnedDocumentItem, SharedDocumentItem } from "@/lib/types";

type Props =
  | { kind: "owned"; items: OwnedDocumentItem[]; emptyMessage: string }
  | { kind: "shared"; items: SharedDocumentItem[]; emptyMessage: string };

function shareLabel(count: number): string {
  if (count === 0) return "Not shared";
  return `Shared with ${count} ${count === 1 ? "person" : "people"}`;
}

function RoleBadge({ role }: { role: SharedDocumentItem["role"] }) {
  const editor = role === "EDITOR";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        editor ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-700"
      }`}
    >
      {editor ? "Editor" : "Viewer"}
    </span>
  );
}

function Updated({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} title={new Date(iso).toLocaleString("en")}>
      Updated {formatRelativeTime(iso)}
    </time>
  );
}

export function DocumentList(props: Props) {
  if (props.items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
        {props.emptyMessage}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
      {props.kind === "owned"
        ? props.items.map((doc) => (
            <Row key={doc.id} id={doc.id} title={doc.title}>
              <span>{shareLabel(doc.shareCount)}</span>
              <Updated iso={doc.updatedAt} />
            </Row>
          ))
        : props.items.map((doc) => (
            <Row key={doc.id} id={doc.id} title={doc.title}>
              <span>Owner: {doc.owner.name}</span>
              <RoleBadge role={doc.role} />
              <Updated iso={doc.updatedAt} />
            </Row>
          ))}
    </ul>
  );
}

function Row({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <li>
      <Link
        href={`/docs/${id}`}
        className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 sm:flex-row sm:items-center sm:justify-between"
      >
        <span className="truncate font-medium text-slate-900">{title}</span>
        <span className="flex shrink-0 flex-wrap items-center gap-3 text-sm text-slate-500">
          {children}
        </span>
      </Link>
    </li>
  );
}
