import { create } from "zustand";
import type { Entry, Page, Session } from "../types";
import { toISODate } from "../lib/time";

interface UiState {
  page: Page;
  selectedDate: string;
  tagFilter: string[];
  editingEntry: Entry | null;
  editingSession: Session | null;
  editorOpen: boolean;
  sessionEditorOpen: boolean;
  setPage: (page: Page) => void;
  setSelectedDate: (date: string) => void;
  toggleTag: (id: string) => void;
  clearTags: () => void;
  openEntryEditor: (entry: Entry | null, date?: string) => void;
  closeEditor: () => void;
  openSessionEditor: (session: Session | null) => void;
  closeSessionEditor: () => void;
}

export const useUi = create<UiState>((set) => ({
  page: "month",
  selectedDate: toISODate(new Date()),
  tagFilter: [],
  editingEntry: null,
  editingSession: null,
  editorOpen: false,
  sessionEditorOpen: false,
  setPage: (page) => set({ page }),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  toggleTag: (id) =>
    set((s) => ({
      tagFilter: s.tagFilter.includes(id)
        ? s.tagFilter.filter((x) => x !== id)
        : [...s.tagFilter, id],
    })),
  clearTags: () => set({ tagFilter: [] }),
  openEntryEditor: (entry, date) =>
    set((s) => ({
      editingEntry: entry,
      editingSession: null,
      editorOpen: true,
      selectedDate: date ?? entry?.date ?? s.selectedDate,
    })),
  closeEditor: () => set({ editingEntry: null, editorOpen: false }),
  openSessionEditor: (session) => set({ editingSession: session, sessionEditorOpen: true }),
  closeSessionEditor: () => set({ editingSession: null, sessionEditorOpen: false }),
}));
