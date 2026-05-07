import { relations } from "drizzle-orm/relations";
import { jobs, clips, user, session, account, experiments } from "./schema";

export const clipsRelations = relations(clips, ({one}) => ({
	job: one(jobs, {
		fields: [clips.jobId],
		references: [jobs.id]
	}),
}));

export const jobsRelations = relations(jobs, ({one, many}) => ({
	clips: many(clips),
	user: one(user, {
		fields: [jobs.userId],
		references: [user.id]
	}),
	experiment: one(experiments, {
		fields: [jobs.experimentId],
		references: [experiments.id]
	}),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	sessions: many(session),
	accounts: many(account),
	jobs: many(jobs),
	experiments: many(experiments),
}));

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const experimentsRelations = relations(experiments, ({one, many}) => ({
	user: one(user, {
		fields: [experiments.userId],
		references: [user.id]
	}),
	jobs: many(jobs),
}));
