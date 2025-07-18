import { create } from 'zustand'

interface ChatState {
  threadId: string | null
  setThreadId: (id: string | null) => void
}

export const useChatStore = create<ChatState>()((set) => ({
  threadId: null,
  setThreadId: (id) => {
    console.log('[Zustand] setThreadId llamado con:', id);
    set({ threadId: id })
  }
})) 