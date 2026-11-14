import { sql } from "drizzle-orm";
import { index, pgEnum, pgTable, primaryKey, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: createdAt(),
  },
  // The database itself rejects A@x.dk when a@x.dk exists, so no code path can forget it.
  (t) => [uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`)],
);

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  postalCode: text("postal_code").notNull(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const groupRole = pgEnum("group_role", ["admin", "member"]);

export const groupMembers = pgTable(
  "group_members",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: groupRole("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // For "which groups am I in". The primary key starts with group_id, so it cannot serve that query.
  (t) => [primaryKey({ columns: [t.groupId, t.userId] }), index("group_members_user_id_idx").on(t.userId)],
);

export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  // A shared link several people can use until it expires. Only the sha256 of the token is stored,
  // so a database leak cannot be used to join groups.
  tokenHash: text("token_hash").notNull().unique(),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

// One list per group (unique group_id), created the first time the group uses it.
export const shoppingLists = pgTable("shopping_lists", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .unique()
    .references(() => groups.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("Indkøb"),
});

// shortcut: no name_normalized, quantity, matched_offer_id or match_score yet; add them with offer matching (phase 4).
export const listItems = pgTable(
  "list_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listId: uuid("list_id")
      .notNull()
      .references(() => shoppingLists.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    note: text("note"),
    addedBy: uuid("added_by").references(() => users.id, { onDelete: "set null" }),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
    checkedBy: uuid("checked_by").references(() => users.id, { onDelete: "set null" }),
    checkedAt: timestamp("checked_at", { withTimezone: true }),
  },
  // The list view reads the unchecked items of one list.
  (t) => [index("list_items_list_id_idx").on(t.listId)],
);
