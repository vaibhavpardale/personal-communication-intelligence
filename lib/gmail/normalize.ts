import type { NewCommunication } from "@/types/communication";
import type { GmailApiMessage, GmailMessagePart } from "@/lib/gmail/client";

const MAX_CONTENT_LENGTH = 5000;

function getHeader(message: GmailApiMessage, name: string): string | null {
  const header = message.payload?.headers?.find(
    (h) => h.name.toLowerCase() === name.toLowerCase(),
  );
  return header?.value ?? null;
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf-8");
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findPart(part: GmailMessagePart | undefined, mimeType: string): GmailMessagePart | null {
  if (!part) return null;
  if (part.mimeType === mimeType && part.body?.data) return part;
  for (const child of part.parts ?? []) {
    const found = findPart(child, mimeType);
    if (found) return found;
  }
  return null;
}

/** Finds the best available body text, preferring text/plain over text/html over the snippet. */
export function extractMessageContent(message: GmailApiMessage): string {
  const payload = message.payload;
  if (!payload) return message.snippet ?? "";

  const root: GmailMessagePart = {
    mimeType: payload.mimeType,
    body: payload.body,
    parts: payload.parts,
  };

  const plainText = findPart(root, "text/plain");
  if (plainText?.body?.data) {
    return decodeBase64Url(plainText.body.data).slice(0, MAX_CONTENT_LENGTH);
  }

  const html = findPart(root, "text/html");
  if (html?.body?.data) {
    return stripHtml(decodeBase64Url(html.body.data)).slice(0, MAX_CONTENT_LENGTH);
  }

  return (message.snippet ?? "").slice(0, MAX_CONTENT_LENGTH);
}

function parseFromHeader(from: string | null): { email: string; name: string | null } {
  if (!from) return { email: "unknown@unknown", name: null };
  const match = from.match(/^(.*?)<(.+)>$/);
  if (match) {
    const name = match[1].trim().replace(/^"|"$/g, "");
    return { email: match[2].trim(), name: name.length > 0 ? name : null };
  }
  return { email: from.trim(), name: null };
}

/**
 * Maps a raw Gmail API message into the same Communication model used for
 * sample data, so it flows through the exact same AI/decision/explanation
 * pipeline — no Gmail-specific processing beyond this normalization step.
 */
export function normalizeGmailMessage(message: GmailApiMessage): NewCommunication {
  const { email, name } = parseFromHeader(getHeader(message, "From"));
  const subject = getHeader(message, "Subject") ?? "(no subject)";
  const dateHeader = getHeader(message, "Date");
  const parsedDate = dateHeader ? new Date(dateHeader) : null;
  const receivedAt =
    parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate.toISOString()
      : new Date(Number(message.internalDate ?? Date.now())).toISOString();

  return {
    source: "gmail",
    source_type: "email",
    sender: email,
    sender_name: name,
    subject,
    content: extractMessageContent(message),
    received_at: receivedAt,
    external_id: message.id,
  };
}
