import { sqliteTable, AnySQLiteColumn, foreignKey, text, real, integer, uniqueIndex } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const clips = sqliteTable("clips", {
	id: text().primaryKey().notNull(),
	jobId: text("job_id").references(() => jobs.id),
	providerClipId: text("provider_clip_id").notNull(),
	title: text(),
	viralityScore: real("virality_score"),
	viralityScoreExplanation: text("virality_score_explanation"),
	duration: real(),
	startTime: real("start_time"),
	endTime: real("end_time"),
	createdAt: integer("created_at").notNull(),
});

export const user = sqliteTable("user", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: integer("email_verified").default(false).notNull(),
	image: text(),
	createdAt: integer("created_at").default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
	updatedAt: integer("updated_at").default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
},
(table) => [
	uniqueIndex("user_email_unique").on(table.email),
]);

export const session = sqliteTable("session", {
	id: text().primaryKey().notNull(),
	expiresAt: integer("expires_at").notNull(),
	token: text().notNull(),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" } ),
},
(table) => [
	uniqueIndex("session_token_unique").on(table.token),
]);

export const account = sqliteTable("account", {
	id: text().primaryKey().notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" } ),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: integer("access_token_expires_at"),
	refreshTokenExpiresAt: integer("refresh_token_expires_at"),
	scope: text(),
	password: text(),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
});

export const verification = sqliteTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: integer("expires_at").notNull(),
	createdAt: integer("created_at"),
	updatedAt: integer("updated_at"),
});

export const jobs = sqliteTable("jobs", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").references(() => user.id),
	experimentId: text("experiment_id").references(() => experiments.id),
	youtubeUrl: text("youtube_url").notNull(),
	providerProjectId: text("provider_project_id"),
	status: text().default("pending").notNull(),
	errorMessage: text("error_message"),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
});

export const experiments = sqliteTable("experiments", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull().references(() => user.id),
	sourceVideoUrl: text("source_video_url").notNull(),
	sourceVideoId: text("source_video_id").notNull(),
	name: text().notNull(),
	description: text(),
	status: text().default("pending").notNull(),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
});
