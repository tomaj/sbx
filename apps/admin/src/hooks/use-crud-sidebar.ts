'use client'

import { useState } from 'react'

export type SidebarMode = 'create' | 'edit'

export interface CrudSidebarState<T> {
  open: boolean
  mode: SidebarMode
  selected: T | null
}

export function useCrudSidebar<T>() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<SidebarMode>('create')
  const [selected, setSelected] = useState<T | null>(null)

  function openCreate() {
    setMode('create')
    setSelected(null)
    setOpen(true)
  }

  function openEdit(item: T) {
    setMode('edit')
    setSelected(item)
    setOpen(true)
  }

  function close() {
    setOpen(false)
  }

  return { open, mode, selected, openCreate, openEdit, close }
}
