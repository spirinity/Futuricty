"use client"

import { createContext, useContext, useState } from "react"

type UserMode = "residents" | "business-owner" | "urban-planner"

type UserModeProviderProps = {
  children: React.ReactNode
  defaultMode?: UserMode
  storageKey?: string
}

type UserModeProviderState = {
  mode: UserMode
  setMode: (mode: UserMode) => void
}

const initialState: UserModeProviderState = {
  mode: "residents",
  setMode: () => null,
}

const UserModeProviderContext = createContext<UserModeProviderState>(initialState)

export function UserModeProvider({
  children,
  defaultMode = "residents",
  storageKey = "futuricity-user-mode",
  ...props
}: UserModeProviderProps) {
  const [mode, setMode] = useState<UserMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(storageKey) as UserMode) || defaultMode
    }
    return defaultMode
  })

  const value = {
    mode,
    setMode: (newMode: UserMode) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, newMode)
      }
      setMode(newMode)
    },
  }

  return (
    <UserModeProviderContext.Provider {...props} value={value}>
      {children}
    </UserModeProviderContext.Provider>
  )
}

export const useUserMode = () => {
  const context = useContext(UserModeProviderContext)
  if (context === undefined)
    throw new Error("useUserMode must be used within a UserModeProvider")
  return context
}
