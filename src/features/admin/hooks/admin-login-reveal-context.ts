import { createContext } from 'react'

export const AdminLoginRevealContext = createContext<{ startedAt: number | null; seen: Set<string>; ready?: boolean }>({ startedAt: null, seen: new Set(), ready:true })
