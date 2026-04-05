'use client';

import { createContext, useContext, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

export { arrayMove };

/** Restricts drag movement to the vertical axis only */
const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

// ---- Context to connect SortableDragHandle to SortableItem ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SortableItemContext = createContext<{
  listeners?: Record<string, any>;
  setActivatorNodeRef?: (node: HTMLElement | null) => void;
}>({});

// ---- SortableItem ----

interface SortableItemProps {
  id: string | number;
  children: React.ReactNode;
  className?: string;
  draggingClassName?: string;
}

export function SortableItem({ id, children, className, draggingClassName }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${className ?? ''} ${isDragging ? (draggingClassName ?? 'opacity-50 shadow-lg') : ''}`}
      {...attributes}
    >
      <SortableItemContext.Provider value={{ listeners, setActivatorNodeRef }}>
        {children}
      </SortableItemContext.Provider>
    </div>
  );
}

// ---- SortableDragHandle ----

export function SortableDragHandle({ className }: { className?: string }) {
  const { listeners, setActivatorNodeRef } = useContext(SortableItemContext);

  return (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className={`cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 shrink-0 touch-none ${className ?? ''}`}
      tabIndex={-1}
      aria-label="Drag to reorder"
      {...listeners}
    >
      <GripVertical className="size-4" />
    </button>
  );
}

// ---- SortableList ----

interface SortableListProps<T> {
  items: T[];
  getKey: (item: T) => string | number;
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export function SortableList<T>({
  items,
  getKey,
  onReorder,
  renderItem,
  className,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => getKey(item) === active.id);
    const newIndex = items.findIndex((item) => getKey(item) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(items, oldIndex, newIndex));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map(getKey)} strategy={verticalListSortingStrategy}>
        <div className={className}>{items.map((item, index) => renderItem(item, index))}</div>
      </SortableContext>
    </DndContext>
  );
}
