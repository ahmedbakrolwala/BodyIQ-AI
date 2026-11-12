import { and, asc, desc, eq } from "drizzle-orm";
import { coachConversations, coachMessages } from "../../drizzle/schema";
import type { CoachMessage } from "../../shared/coach";
import { getDb } from "../db";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured or reachable");
  return db;
}
function toMessage(row: typeof coachMessages.$inferSelect): CoachMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  };
}
async function conversationFor(db: any, userId: number) {
  const rows = await db
    .select()
    .from(coachConversations)
    .where(eq(coachConversations.userId, userId))
    .orderBy(asc(coachConversations.id))
    .limit(1);
  if (rows[0]) return rows[0];
  const inserted = await db
    .insert(coachConversations)
    .values({ userId })
    .$returningId();
  const id = inserted[0]?.id;
  if (!id) throw new Error("Coach conversation could not be created");
  const created = await db
    .select()
    .from(coachConversations)
    .where(eq(coachConversations.id, id))
    .limit(1);
  if (!created[0]) throw new Error("Coach conversation could not be read");
  return created[0];
}
export async function history(
  userId: number,
  limit = 50,
): Promise<CoachMessage[]> {
  const db = await requireDb();
  const conversations = await db
    .select()
    .from(coachConversations)
    .where(eq(coachConversations.userId, userId))
    .orderBy(asc(coachConversations.id))
    .limit(1);
  if (!conversations[0]) return [];
  const rows = await db
    .select()
    .from(coachMessages)
    .where(
      and(
        eq(coachMessages.userId, userId),
        eq(coachMessages.conversationId, conversations[0].id),
      ),
    )
    .orderBy(desc(coachMessages.createdAt), desc(coachMessages.id))
    .limit(Math.min(Math.max(limit, 1), 100));
  return rows.reverse().map(toMessage);
}
export async function appendTurn(
  userId: number,
  userText: string,
  assistantText: string,
): Promise<CoachMessage[]> {
  const db = await requireDb();
  return db.transaction(async (tx) => {
    const conversation = await conversationFor(tx, userId);
    await tx.insert(coachMessages).values([
      {
        conversationId: conversation.id,
        userId,
        role: "user",
        content: userText,
      },
      {
        conversationId: conversation.id,
        userId,
        role: "assistant",
        content: assistantText,
      },
    ]);
    await tx
      .update(coachConversations)
      .set({ updatedAt: new Date() })
      .where(eq(coachConversations.id, conversation.id));
    const rows = await tx
      .select()
      .from(coachMessages)
      .where(
        and(
          eq(coachMessages.userId, userId),
          eq(coachMessages.conversationId, conversation.id),
        ),
      )
      .orderBy(desc(coachMessages.createdAt), desc(coachMessages.id))
      .limit(100);
    return rows.reverse().map(toMessage);
  });
}
