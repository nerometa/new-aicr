import { sqliteTable, text, integer, real, uniqueIndex, index, primaryKey } from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"
import { relations } from "drizzle-orm/relations"

export const user = sqliteTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
	image: text("image"),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
}, (table) => [
	index("user_email_unique").on(table.email),
])

export const session = sqliteTable("session", {
	id: text("id").primaryKey(),
	expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
	token: text("token").notNull().unique(),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (table) => [
	index("session_token_unique").on(table.token),
])

export const account = sqliteTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
	refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
	scope: text("scope"),
	password: text("password"),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
})

export const verification = sqliteTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
	createdAt: integer("created_at", { mode: "timestamp_ms" }),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
})

export const jobs = sqliteTable("jobs", {
	id: text("id").primaryKey(),
	userId: text("user_id").references(() => user.id),
	experimentId: text("experiment_id").references(() => experiments.id),
	youtubeUrl: text("youtube_url").notNull(),
	provider: text("provider").notNull().default("reap"),
	providerProjectId: text("provider_project_id"),
	status: text("status").notNull().default("pending"),
	errorMessage: text("error_message"),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})

export const clips = sqliteTable("clips", {
	id: text("id").primaryKey(),
	jobId: text("job_id").references(() => jobs.id),
	providerClipId: text("provider_clip_id").notNull(),
	title: text("title"),
	viralityScore: real("virality_score"),
	viralityScoreExplanation: text("virality_score_explanation"),
	duration: real("duration"),
	startTime: real("start_time"),
	endTime: real("end_time"),
	clipUrl: text("clip_url"),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [
	uniqueIndex("clips_job_provider_unique").on(table.jobId, table.providerClipId),
])

export const experiments = sqliteTable("experiments", {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull().references(() => user.id),
	sourceVideoUrl: text("source_video_url").notNull(),
	sourceVideoId: text("source_video_id").notNull(),
	provider: text("provider").notNull().default("reap"),
	name: text("name").notNull(),
	description: text("description"),
	status: text("status").notNull().default("pending"),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
}))

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}))

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}))

export const experimentsRelations = relations(experiments, ({ one, many }) => ({
	user: one(user, {
		fields: [experiments.userId],
		references: [user.id],
	}),
	jobs: many(jobs),
}))

export const jobsRelations = relations(jobs, ({ one, many }) => ({
	user: one(user, {
		fields: [jobs.userId],
		references: [user.id],
	}),
	experiment: one(experiments, {
		fields: [jobs.experimentId],
		references: [experiments.id],
	}),
	clips: many(clips),
}))

export const clipsRelations = relations(clips, ({ one }) => ({
	job: one(jobs, {
		fields: [clips.jobId],
		references: [jobs.id],
	}),
}))
