"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase, Task } from "@/lib/supabase";

const columns = [
  { id: "backlog", label: "INBOX", color: "bg-neutral-700" },
  { id: "todo", label: "ASSIGNED", color: "bg-blue-600" },
  { id: "in_progress", label: "IN PROGRESS", color: "bg-yellow-600" },
  { id: "review", label: "REVIEW", color: "bg-purple-600" },
  { id: "done", label: "DONE", color: "bg-green-600" },
];

const priorityColors = {
  high: "bg-red-500/20 text-red-400 border-red-500/30",
  medium: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

function SortableTask({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="bg-neutral-800/50 border-neutral-700 hover:border-neutral-600 cursor-grab active:cursor-grabbing">
        <CardContent className="p-3">
          <h4 className="text-sm font-medium text-neutral-200 line-clamp-2">{task.title}</h4>
          <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{task.description}</p>
          <div className="flex items-center justify-between mt-3">
            <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${priorityColors[task.priority]}`}>
              {task.priority}
            </Badge>
            {task.assignee && <span className="text-[10px] text-neutral-500">@{task.assignee}</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch tasks from Supabase
  useEffect(() => {
    async function fetchTasks() {
      const { data, error } = await supabase.from('tasks').select('*').order('position');
      if (error) console.error('Error fetching tasks:', error);
      else setTasks(data || []);
      setLoading(false);
    }
    fetchTasks();

    // Subscribe to realtime changes
    const subscription = supabase
      .channel('tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTasks((prev) => [...prev, payload.new as Task]);
        } else if (payload.eventType === 'UPDATE') {
          setTasks((prev) => prev.map((t) => (t.id === payload.new.id ? (payload.new as Task) : t)));
        } else if (payload.eventType === 'DELETE') {
          setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, []);

  // SSE for activity feed updates
  useEffect(() => {
    const eventSource = new EventSource('/api/sse');
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('SSE message:', data);
    };
    return () => { eventSource.close(); };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    const overTask = tasks.find((t) => t.id === over.id);
    if (!activeTask || !overTask) return;

    // If different columns, update status
    if (activeTask.column_status !== overTask.column_status) {
      const newStatus = overTask.column_status;
      setTasks((prev) => prev.map((t) => t.id === active.id ? { ...t, column_status: newStatus } : t));
      
      // Update in Supabase
      await supabase.from('tasks').update({ column_status: newStatus }).eq('id', active.id);
    } else {
      // Same column, reorder
      setTasks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  if (loading) return <div className="flex items-center justify-center h-full text-neutral-500">Loading...</div>;

  return (
    <div className="flex flex-col bg-neutral-950 overflow-hidden">
      <CardHeader className="pb-3 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-300">Tasks</h2>
          <span className="text-xs text-neutral-500">{tasks.length} total</span>
        </div>
      </CardHeader>

      <div className="flex-1 overflow-auto p-4">
        <div className="flex gap-4 h-full min-w-max">
          {columns.map((column) => {
            const columnTasks = tasks.filter((task) => task.column_status === column.id);
            return (
              <div key={column.id} className="w-72 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${column.color}`} />
                    <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{column.label}</h3>
                  </div>
                  <span className="text-xs text-neutral-600">{columnTasks.length}</span>
                </div>

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={columnTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex-1 space-y-2">
                      {columnTasks.map((task) => <SortableTask key={task.id} task={task} />)}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
