import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ── 内部元数据（key-value）──
export const metadataTable = sqliteTable("_metadata", {
  key: text().primaryKey(),
  value: text(),
  createdAt: integer({ mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Metadata = typeof metadataTable.$inferSelect;
