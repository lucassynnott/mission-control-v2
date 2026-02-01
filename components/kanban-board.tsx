"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus } from "lucide-react";
import { supabase, Task } from "@/lib/supabase";

const COLUMNS = [
  { id: "backlog", label: "INBOX", color: "bg-neutral-700" },
  { id: "todo", label: "ASSIGNED", color: "bg-blue-600" },
  { id: "in_progress", label: "IN PROGRESS", color: "bg-yellow-600" },
  { id: "review", label: "REVIEW", color: "bg-purple-600" },
  { id: "done", label: "DONE", color: "bg-green-600" },
];

const PRIORITY_COLORS = {
  high: "bg-red-500/20 text-red-400 border-red-500/30",
  medium: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

function SortableTask({
  task,
  onClick,
}: {
  task: Task;
  onClick: (task: Task) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className="bg-neutral-800/50 border-neutral-700 hover:border-neutral-600 cursor-grab active:cursor-grabbing"
        onClick={() => onClick(task)}
      >
        <CardContent className="p-3">
          <h4 className="text-sm font-medium text-neutral-200 line-clamp-2">
            {task.title}
          </h4>
          <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
            {task.description}
          </p>
          <div className="flex items-center justify-between mt-3">
            <Badge
              variant="outline"
              className={`text-[10px] h-5 px-1.5 ${PRIORITY_COLORS[task.priority]}`}
            >
              {task.priority}
            </Badge>
            {task.assignee && (
              <span className="text-[10px] text-neutral-500">
                @{task.assignee}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface TaskFormData {
  title: string;
  description: string;
  column_status: Task["column_status"];
  priority: Task["priority"];
  assignee: string;
}

interface KanbanBoardProps {
  isMobile?: boolean;
}

export function KanbanBoard({ isMobile }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeColumn, setActiveColumn] = useState("backlog");
  const [formData, setFormData] = useState<TaskFormData>({
    title: "",
    description: "",
    column_status: "backlog",
    priority: "medium",
    assignee: "",
  });

  // Fetch tasks from Supabase
  useEffect(() => {
    async function fetchTasks() {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("position");
      
      if (error) {
        console.error("Error fetching tasks:", error);
        // Fallback to empty array if DB not connected
        setTasks([]);
      } else {
        setTasks(data || []);
      }
      setLoading(false);
    }
    fetchTasks();

    // Subscribe to realtime changes
    const subscription = supabase
      .channel("tasks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTasks((prev) => [...prev, payload.new as Task]);
          } else if (payload.eventType === "UPDATE") {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === payload.new.id ? (payload.new as Task) : t
              )
            );
          } else if (payload.eventType === "DELETE") {
            setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
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
      setTasks((prev) =>
        prev.map((t) =>
          t.id === active.id ? { ...t, column_status: newStatus } : t
        )
      );

      // Update in Supabase
      await supabase
        .from("tasks")
        .update({ column_status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", active.id);
    } else {
      // Same column, reorder
      setTasks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    
    const newTask = {
      title: formData.title,
      description: formData.description,
      column_status: formData.column_status,
      priority: formData.priority,
      assignee: formData.assignee || null,
      project_tag: "Mission Control",
      position: tasks.length,
    };

    const { error } = await supabase.from("tasks").insert(newTask).select();
    
    if (error) {
      console.error("Error creating task:", error);
    } else {
      setShowCreateDialog(false);
      setFormData({
        title: "",
        description: "",
        column_status: "backlog",
        priority: "medium",
        assignee: "",
      });
    }
  }

  async function handleUpdateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTask) return;

    const { error } = await supabase
      .from("tasks")
      .update({
        title: formData.title,
        description: formData.description,
        column_status: formData.column_status,
        priority: formData.priority,
        assignee: formData.assignee || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedTask.id);

    if (error) {
      console.error("Error updating task:", error);
    } else {
      setSelectedTask(null);
    }
  }

  function openTaskDialog(task: Task) {
    setFormData({
      title: task.title,
      description: task.description,
      column_status: task.column_status,
      priority: task.priority,
      assignee: task.assignee || "",
    });
    setSelectedTask(task);
  }

  function openCreateDialog() {
    setFormData({
      title: "",
      description: "",
      column_status: "backlog",
      priority: "medium",
      assignee: "",
    });
    setShowCreateDialog(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-500">
        Loading tasks...
      </div>
    );
  }

  // Mobile column view
  if (isMobile) {
    const column = COLUMNS.find(c => c.id === activeColumn)!;
    const columnTasks = tasks.filter(t => t.column_status === activeColumn);

    return (
      <div className="flex flex-col bg-neutral-950 h-full overflow-hidden">
        {/* Column Selector */}
        <div className="flex overflow-x-auto gap-1 p-2 border-b border-neutral-800">
          {COLUMNS.map((col) => (
            <Button
              key={col.id}
              variant={activeColumn === col.id ? 'default' : 'ghost'}
              size="sm"
              className="flex-shrink-0 text-xs"
              onClick={() => setActiveColumn(col.id)}
            >
              <div className={`w-2 h-2 rounded-full ${col.color} mr-2`} />
              {col.label}
              <span className="ml-1 text-neutral-500">
                ({tasks.filter(t => t.column_status === col.id).length})
              </span>
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            className="flex-shrink-0 h-8 w-8 p-0"
            onClick={openCreateDialog}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Single Column View */}
        <div className="flex-1 overflow-auto p-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={columnTasks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {columnTasks.map((task) => (
                  <SortableTask
                    key={task.id}
                    task={task}
                    onClick={openTaskDialog}
                  />
                ))}
                {columnTasks.length === 0 && (
                  <div className="text-center py-8 text-neutral-500 text-sm">
                    No tasks in {column.label}
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {renderDialogs()}
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-neutral-950 overflow-hidden">
      <CardHeader className="pb-3 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-300">Tasks</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">{tasks.length} total</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={openCreateDialog}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <div className="flex-1 overflow-auto p-4">
        <div className="flex gap-4 h-full min-w-max">
          {COLUMNS.map((column) => {
            const columnTasks = tasks.filter(
              (task) => task.column_status === column.id
            );

            return (
              <div key={column.id} className="w-72 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${column.color}`} />
                    <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      {column.label}
                    </h3>
                  </div>
                  <span className="text-xs text-neutral-600">
                    {columnTasks.length}
                  </span>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={columnTasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex-1 space-y-2">
                      {columnTasks.map((task) => (
                        <SortableTask
                          key={task.id}
                          task={task}
                          onClick={openTaskDialog}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            );
          })}
        </div>
      </div>

      {renderDialogs()}
    </div>
  );

  function renderDialogs() {
    return (
      <>
        {/* Create Task Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-100 max-w-[calc(100vw-2rem)] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <Label className="text-neutral-400">Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="bg-neutral-800 border-neutral-700 text-neutral-200"
                  required
                />
              </div>
              <div>
                <Label className="text-neutral-400">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="bg-neutral-800 border-neutral-700 text-neutral-200 min-h-[80px] sm:min-h-[100px]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-neutral-400">Status</Label>
                  <Select
                    value={formData.column_status}
                    onValueChange={(v) =>
                      setFormData({ ...formData, column_status: v as Task["column_status"] })
                    }
                  >
                    <SelectTrigger className="bg-neutral-800 border-neutral-700 text-neutral-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-800 border-neutral-700">
                      {COLUMNS.map((col) => (
                        <SelectItem key={col.id} value={col.id}>
                          {col.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-neutral-400">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(v) =>
                      setFormData({ ...formData, priority: v as Task["priority"] })
                    }
                  >
                    <SelectTrigger className="bg-neutral-800 border-neutral-700 text-neutral-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-800 border-neutral-700">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-neutral-400">Assignee</Label>
                <Input
                  value={formData.assignee}
                  onChange={(e) =>
                    setFormData({ ...formData, assignee: e.target.value })
                  }
                  placeholder="@agent-name"
                  className="bg-neutral-800 border-neutral-700 text-neutral-200"
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                Create Task
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Task Dialog */}
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="bg-neutral-900 border-neutral-800 text-neutral-100 max-w-[calc(100vw-2rem)] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateTask} className="space-y-4">
              <div>
                <Label className="text-neutral-400">Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="bg-neutral-800 border-neutral-700 text-neutral-200"
                  required
                />
              </div>
              <div>
                <Label className="text-neutral-400">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="bg-neutral-800 border-neutral-700 text-neutral-200 min-h-[80px] sm:min-h-[100px]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-neutral-400">Status</Label>
                  <Select
                    value={formData.column_status}
                    onValueChange={(v) =>
                      setFormData({ ...formData, column_status: v as Task["column_status"] })
                    }
                  >
                    <SelectTrigger className="bg-neutral-800 border-neutral-700 text-neutral-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-800 border-neutral-700">
                      {COLUMNS.map((col) => (
                        <SelectItem key={col.id} value={col.id}>
                          {col.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-neutral-400">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(v) =>
                      setFormData({ ...formData, priority: v as Task["priority"] })
                    }
                  >
                    <SelectTrigger className="bg-neutral-800 border-neutral-700 text-neutral-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-800 border-neutral-700">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-neutral-400">Assignee</Label>
                <Input
                  value={formData.assignee}
                  onChange={(e) =>
                    setFormData({ ...formData, assignee: e.target.value })
                  }
                  placeholder="@agent-name"
                  className="bg-neutral-800 border-neutral-700 text-neutral-200"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Update Task
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={async () => {
                    if (!selectedTask) return;
                    await supabase.from("tasks").delete().eq("id", selectedTask.id);
                    setSelectedTask(null);
                  }}
                >
                  Delete
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  }
}
