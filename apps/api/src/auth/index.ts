import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins/admin'
import { db } from '../db'
import {
  ac,
  adminRole,
  responsableRole,
  agentRole,
  superviseurRole,
} from './permissions'

export const auth = betterAuth({
  secret:         process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [process.env.WEB_URL ?? 'http://localhost:34000'],

  database: drizzleAdapter(db, {
    provider: 'pg',
  }),

  emailAndPassword: {
    enabled: true,
  },

  plugins: [
    admin({
      ac,
      roles: {
        admin:       adminRole,
        responsable: responsableRole,
        agent:       agentRole,
        superviseur: superviseurRole,
      },
    }),
  ],
})

export type Auth = typeof auth
