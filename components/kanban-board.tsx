"use client";

import { useState, useEffect } from "react";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
import { Plus, Target, AlertTriangle, CheckCircle, Clock, Inbox, CalendarIcon, MessageSquare, Send, Eye, EyeOff } from "lucide-react";
import { supabase, Task, Agent } from "@/lib/supabase";
import { format } from "date-fns";
import { highlightMentions } from "@/lib/mention-parser";

// Cyberpunk column styling
const COLUMNS = [
  { id: "backlog", label: "INBOX", color: "bg-cyber-panel", borderColor: "border-cyber-cyan/30", icon: Inbox },
  { id: "todo", label: "ASSIGNED", color: "bg-cyber-cyan/10", borderColor: "border-cyber-cyan", icon: Target },
  { id: "in_progress", label: "IN PROGRESS", color: "bg-cyber-yellow/10", borderColor: "border-cyber-yellow", icon: Clock },
  { id: "blocked", label: "BLOCKED", color: "bg-red-900/20", borderColor: "border-red-500", icon: AlertTriangle },
  { id: "review", label: "REVIEW", color: "bg-purple-500/10", borderColor: "border-purple-500", icon: Eye },
  { id: "done", label: "DONE", color: "bg-cyber-red/10", borderColor: "border-cyber-red", icon: CheckCircle },
];

const PRIORITY_COLORS = {
  high: "bg-cyber-red/20 text-cyber-red border-cyber-red/50",
  medium: "bg-cyber-yellow/20 text-cyber-yellow border-cyber-yellow/50",
  low: "bg-cyber-cyan/20 text-cyber-cyan border-cyber-cyan/50",
};

// Cyberpunk task card
function SortableTask({ task, onClick, subscriberCount }: { task: Task; onClick: (task: Task) => void; subscriberCount?: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div
        className="relative bg-cyber-panel border border-cyber-red/30 hover:border-cyber-red/60 cursor-grab active:cursor-grabbing group transition-all"
        onClick={() => onClick(task)}
      >
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-cyber-red/50 group-hover:border-cyber-red" />
        <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-cyber-red/50 group-hover:border-cyber-red" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b border-cyber-red/50 group-hover:border-cyber-red" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-cyber-red/50 group-hover:border-cyber-red" />
        
        <CardContent className="p-3">
          <h4 className="text-sm font-bold text-white line-clamp-2 tracking-wide group-hover:text-cyber-cyan transition-colors">
            {task.title}
          </h4>
          <p className="text-xs text-cyber-cyan/50 mt-1 line-clamp-2 font-mono">
            {task.description || 'NO_DESCRIPTION'}
          </p>
          {task.due_date && (
            <div className="flex items-center gap-1 mt-2">
              <CalendarIcon className="h-3 w-3 text-cyber-cyan" />
              <span className="text-[10px] text-cyber-cyan font-mono">
                {format(new Date(task.due_date), 'MMM dd, yyyy')}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className={`text-[10px] h-5 px-1.5 font-mono uppercase ${PRIORITY_COLORS[task.priority]}`}
              >
                {task.priority}
              </Badge>
              {subscriberCount !== undefined && subscriberCount > 0 && (
                <div className="flex items-center gap-0.5 text-[10px] text-cyber-cyan/60 font-mono">
                  <Eye className="h-3 w-3" />
                  <span>{subscriberCount}</span>
                </div>
              )}
            </div>
            {task.assignee && (
              <span className="text-[10px] text-cyber-cyan/60 font-mono">
                @{task.assignee.toUpperCase()}
              </span>
            )}
          </div>
        </CardContent>
      </div>
    </div>
  );
}

interface TaskFormData {
  title: string;
  description: string;
  column_status: Task["column_status"];
  priority: Task["priority"];
  assignee: string;
  due_date: Date | undefined;
}

interface Comment {
  id: string;
  task_id: string;
  author: string;
  message: string;
  created_at: string;
}

interface Subscriber {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_avatar: string | null;
  agent_status: string;
  subscribed_at: string;
}

interface KanbanBoardProps {
  isMobile?: boolean;
}

export function KanbanBoard({ isMobile }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeColumn, setActiveColumn] = useState("backlog");
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCounts, setSubscriberCounts] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState<TaskFormData>({
    title: "",
    description: "",
    column_status: "backlog",
    priority: "medium",
    assignee: "",
    due_date: undefined,
  });

  useEffect(() => {
    fetchTasks();
    fetchAgents();
    fetchCurrentAgent();
    fetchAllSubscriberCounts();

    const subscription = supabase
      .channel("tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setTasks((prev) => [...prev, payload.new as Task]);
        } else if (payload.eventType === "UPDATE") {
          setTasks((prev) => prev.map((t) => (t.id === payload.new.id ? (payload.new as Task) : t)));
        } else if (payload.eventType === "DELETE") {
          setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, []);

  // Fetch comments and subscribers when a task is selected
  useEffect(() => {
    if (selectedTask) {
      fetchComments(selectedTask.id);
      fetchSubscribers(selectedTask.id);
    }
  }, [selectedTask]);

  async function fetchTasks() {
    const { data, error } = await supabase.from("tasks").select("*").order("position");
    if (error) console.error("Error fetching tasks:", error);
    else setTasks(data || []);
    setLoading(false);
  }

  async function fetchAgents() {
    const { data, error } = await supabase.from("agents").select("*").order("name");
    if (error) console.error("Error fetching agents:", error);
    else setAgents(data || []);
  }

  async function fetchCurrentAgent() {
    // Get the first active agent as the current user (for demo purposes)
    const { data, error } = await supabase.from("agents").select("*").eq("status", "active").limit(1).single();
    if (error) console.error("Error fetching current agent:", error);
    else setCurrentAgent(data);
  }

  async function fetchComments(taskId: string) {
    const { data, error } = await supabase
      .from("task_comments")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });
    
    if (error) {
      console.error("Error fetching comments:", error);
      setComments([]);
    } else {
      setComments(data || []);
    }
  }

  async function fetchSubscribers(taskId: string) {
    try {
      const response = await fetch(`/api/tasks/subscribe?taskId=${taskId}`);
      const data = await response.json();
      
      if (response.ok) {
        setSubscribers(data.subscribers || []);
        // Check if current agent is subscribed
        if (currentAgent) {
          const isCurrentAgentSubscribed = data.subscribers.some(
            (sub: Subscriber) => sub.agent_id === currentAgent.id
          );
          setIsSubscribed(isCurrentAgentSubscribed);
        }
        // Update the count for this task
        setSubscriberCounts(prev => ({
          ...prev,
          [taskId]: data.count || 0
        }));
      }
    } catch (error) {
      console.error("Error fetching subscribers:", error);
      setSubscribers([]);
    }
  }

  async function fetchAllSubscriberCounts() {
    try {
      // Fetch subscriber counts for all tasks
      const { data: subscriptions, error } = await supabase
        .from('task_subscriptions')
        .select('task_id');
      
      if (error) {
        console.error("Error fetching subscription counts:", error);
        return;
      }

      // Count subscribers per task
      const counts: Record<string, number> = {};
      subscriptions?.forEach(sub => {
        counts[sub.task_id] = (counts[sub.task_id] || 0) + 1;
      });
      
      setSubscriberCounts(counts);
    } catch (error) {
      console.error("Error fetching subscriber counts:", error);
    }
  }

  async function handleAddComment() {
    if (!selectedTask || !newComment.trim() || !currentAgent) return;

    try {
      // Use the new API endpoint that handles subscriptions and notifications
      const response = await fetch('/api/tasks/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selectedTask.id,
          authorId: currentAgent.id,
          message: newComment.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Error adding comment:", result.error);
        return;
      }

      // Update local state
      setComments((prev) => [...prev, result.comment as Comment]);
      setNewComment("");
      
      // Refresh subscribers (commenter is now auto-subscribed)
      fetchSubscribers(selectedTask.id);
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  }

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

    if (activeTask.column_status !== overTask.column_status) {
      const newStatus = overTask.column_status;
      const oldStatus = activeTask.column_status;
      setTasks((prev) => prev.map((t) => (t.id === active.id ? { ...t, column_status: newStatus } : t)));
      await supabase.from("tasks").update({ column_status: newStatus, updated_at: new Date().toISOString() }).eq("id", active.id);
      
      // Emit activity
      const statusLabel = COLUMNS.find(c => c.id === newStatus)?.label || newStatus;
      await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'task',
          message: `Moved "${activeTask.title}" to ${statusLabel}`,
          agent: currentAgent?.name || 'System',
          agentAvatar: currentAgent?.avatar_emoji || '🤖',
          metadata: {
            taskId: activeTask.id,
            taskTitle: activeTask.title,
          },
        }),
      });
    } else {
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
      due_date: formData.due_date ? formData.due_date.toISOString() : null,
    };

    const { data, error } = await supabase.from("tasks").insert(newTask).select();
    if (error) {
      console.error("Error creating task:", error);
    } else {
      setShowCreateDialog(false);
      setFormData({ title: "", description: "", column_status: "backlog", priority: "medium", assignee: "", due_date: undefined });
      
      // Emit activity
      const createdTask = data?.[0];
      if (createdTask) {
        await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'task',
            message: `Created new task "${formData.title}"`,
            agent: currentAgent?.name || 'System',
            agentAvatar: currentAgent?.avatar_emoji || '🤖',
            metadata: {
              taskId: createdTask.id,
              taskTitle: formData.title,
            },
          }),
        });
        
        // Parse @mentions in task description
        // Note: This is handled by the backend now
        // if (formData.description.includes('@')) {
        //   await parseMentions(formData.description, {
        //     taskId: createdTask.id,
        //     taskTitle: formData.title,
        //     mentionedBy: currentAgent?.name || 'System',
        //     link: `/tasks/${createdTask.id}`,
        //   });
        // }
      }
    }
  }

  async function handleUpdateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTask) return;

    // Use the new API endpoint that handles assignment notifications
    try {
      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTask.id,
          title: formData.title,
          description: formData.description,
          column_status: formData.column_status,
          priority: formData.priority,
          assignee: formData.assignee || null,
          due_date: formData.due_date ? formData.due_date.toISOString() : null,
        }),
      });

      if (response.ok) {
        setSelectedTask(null);
      } else {
        const result = await response.json();
        console.error("Error updating task:", result.error);
      }
    } catch (error) {
      console.error("Error updating task:", error);
    }
  }

  function openTaskDialog(task: Task) {
    setFormData({
      title: task.title,
      description: task.description,
      column_status: task.column_status,
      priority: task.priority,
      assignee: task.assignee || "",
      due_date: task.due_date ? new Date(task.due_date) : undefined,
    });
    setSelectedTask(task);
  }

  function openCreateDialog() {
    setFormData({ title: "", description: "", column_status: "backlog", priority: "medium", assignee: "", due_date: undefined });
    setShowCreateDialog(true);
  }

  async function handleToggleSubscription() {
    if (!selectedTask || !currentAgent) return;

    try {
      const action = isSubscribed ? 'unsubscribe' : 'subscribe';
      const response = await fetch('/api/tasks/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selectedTask.id,
          agentId: currentAgent.id,
          action,
        }),
      });

      if (response.ok) {
        setIsSubscribed(!isSubscribed);
        fetchSubscribers(selectedTask.id);
      }
    } catch (error) {
      console.error("Error toggling subscription:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-cyber-cyan/40 font-mono">
        <span className="animate-pulse">INITIALIZING_TASK_MATRIX...</span>
      </div>
    );
  }

  // Mobile view
  if (isMobile) {
    const column = COLUMNS.find(c => c.id === activeColumn)!;
    const columnTasks = tasks.filter(t => t.column_status === activeColumn);

    return (
      <div className="flex flex-col bg-cyber-dark h-full overflow-hidden">
        {/* Column Selector */}
        <div className="flex overflow-x-auto gap-1 p-2 border-b border-cyber-red/30 bg-cyber-panel">
          {COLUMNS.map((col) => {
            const Icon = col.icon;
            const count = tasks.filter(t => t.column_status === col.id).length;
            return (
              <Button
                key={col.id}
                variant={activeColumn === col.id ? 'default' : 'ghost'}
                size="sm"
                className={`flex-shrink-0 text-xs rounded-none ${
                  activeColumn === col.id 
                    ? 'bg-cyber-red text-white border-b-2 border-cyber-red' 
                    : 'text-cyber-cyan/60 hover:text-cyber-cyan border-b-2 border-transparent'
                }`}
                onClick={() => setActiveColumn(col.id)}
              >
                <Icon className="h-3 w-3 mr-1" />
                {col.label}
                <span className="ml-1 text-[10px] opacity-60">({count})</span>
              </Button>
            );
          })}
          <Button size="sm" variant="ghost" className="flex-shrink-0 h-8 w-8 p-0 text-cyber-red" onClick={openCreateDialog}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Single Column */}
        <div className="flex-1 overflow-auto p-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={columnTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {columnTasks.map((task) => <SortableTask key={task.id} task={task} onClick={openTaskDialog} subscriberCount={subscriberCounts[task.id]} />)}
                {columnTasks.length === 0 && (
                  <div className="text-center py-8 text-cyber-cyan/30 font-mono text-xs">
                    NO_TASKS_IN_{column.label.toUpperCase().replace(/\s+/g, '_')}
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

  // Desktop view
  return (
    <div className="flex flex-col bg-cyber-dark overflow-hidden h-full">
      {/* Header */}
      <div className="p-3 border-b border-cyber-red/30 bg-cyber-panel flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-cyber-red" />
          <div>
            <h2 className="text-sm font-bold text-white tracking-wider">MISSION BOARD</h2>
            <p className="text-[10px] text-cyber-cyan/60 font-mono">{tasks.length} OBJECTIVES TRACKED</p>
          </div>
        </div>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-cyber-red hover:bg-cyber-red/10" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Kanban Columns */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex gap-4 h-full min-w-max">
          {COLUMNS.map((column) => {
            const columnTasks = tasks.filter((task) => task.column_status === column.id);
            const ColumnIcon = column.icon;

            return (
              <div key={column.id} className="w-72 flex flex-col">
                {/* Column Header */}
                <div className={`p-3 border ${column.borderColor} ${column.color} mb-3`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ColumnIcon className="h-4 w-4 text-cyber-cyan" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        {column.label}
                      </h3>
                    </div>
                    <span className="text-xs font-mono text-cyber-cyan/60">{columnTasks.length}</span>
                  </div>
                </div>

                {/* Tasks */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={columnTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex-1 space-y-2 min-h-[100px]">
                      {columnTasks.map((task) => <SortableTask key={task.id} task={task} onClick={openTaskDialog} subscriberCount={subscriberCounts[task.id]} />)}
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
        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="bg-cyber-dark border-2 border-cyber-red/50 max-w-[calc(100vw-2rem)] sm:max-w-lg p-0">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyber-red to-transparent" />
            <DialogHeader className="p-6 pb-0 bg-cyber-panel border-b border-cyber-red/30">
              <DialogTitle className="text-lg font-bold text-white tracking-wider uppercase flex items-center gap-2">
                <Plus className="h-5 w-5 text-cyber-red" />
                New Mission
              </DialogTitle>
              <DialogDescription className="text-cyber-cyan/60 text-xs font-mono">
                Create a new mission for your agents
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="space-y-4 p-6">
              <div>
                <Label className="text-cyber-cyan/60 text-xs font-mono uppercase">Mission Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="bg-cyber-panel border-cyber-red/30 text-white focus:border-cyber-red rounded-none"
                  required
                />
              </div>
              <div>
                <Label className="text-cyber-cyan/60 text-xs font-mono uppercase">Briefing</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-cyber-panel border-cyber-red/30 text-white focus:border-cyber-red rounded-none min-h-[120px] font-mono text-sm"
                  placeholder="Mission details and objectives..."
                />
              </div>
              <div>
                <Label className="text-cyber-cyan/60 text-xs font-mono uppercase">Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-mono bg-cyber-panel border-cyber-red/30 text-white hover:bg-cyber-panel hover:border-cyber-cyan rounded-none"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-cyber-cyan" />
                      {formData.due_date ? format(formData.due_date, "PPP") : <span className="text-cyber-cyan/50">Set deadline...</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-cyber-dark border-cyber-red/50 rounded-none">
                    <Calendar
                      mode="single"
                      selected={formData.due_date}
                      onSelect={(date) => setFormData({ ...formData, due_date: date })}
                      initialFocus
                      className="bg-cyber-dark text-white font-mono"
                      classNames={{
                        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                        month: "space-y-4",
                        caption: "flex justify-center pt-1 relative items-center text-cyber-cyan",
                        caption_label: "text-sm font-bold uppercase tracking-wider",
                        nav: "space-x-1 flex items-center",
                        nav_button: "h-7 w-7 bg-transparent p-0 text-cyber-cyan hover:text-cyber-red border border-cyber-red/30 hover:border-cyber-red",
                        nav_button_previous: "absolute left-1",
                        nav_button_next: "absolute right-1",
                        table: "w-full border-collapse space-y-1",
                        head_row: "flex",
                        head_cell: "text-cyber-cyan/60 rounded-none w-9 font-mono text-[0.7rem] uppercase",
                        row: "flex w-full mt-2",
                        cell: "h-9 w-9 text-center text-sm p-0 relative hover:bg-cyber-red/10",
                        day: "h-9 w-9 p-0 font-mono text-white hover:bg-cyber-red/20 hover:text-cyber-cyan aria-selected:bg-cyber-red aria-selected:text-white",
                        day_selected: "bg-cyber-red text-white hover:bg-cyber-red hover:text-white font-bold",
                        day_today: "bg-cyber-cyan/20 text-cyber-cyan font-bold",
                        day_outside: "text-cyber-cyan/20 opacity-50",
                        day_disabled: "text-cyber-cyan/20 opacity-30",
                        day_hidden: "invisible",
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-cyber-cyan/60 text-xs font-mono uppercase">Status</Label>
                  <Select value={formData.column_status} onValueChange={(v) => setFormData({ ...formData, column_status: v as Task["column_status"] })}>
                    <SelectTrigger className="bg-cyber-panel border-cyber-red/30 text-white rounded-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-cyber-dark border-cyber-red/50 rounded-none">
                      {COLUMNS.map((col) => <SelectItem key={col.id} value={col.id} className="text-white">{col.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-cyber-cyan/60 text-xs font-mono uppercase">Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v as Task["priority"] })}>
                    <SelectTrigger className="bg-cyber-panel border-cyber-red/30 text-white rounded-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-cyber-dark border-cyber-red/50 rounded-none">
                      <SelectItem value="low" className="text-cyber-cyan">LOW</SelectItem>
                      <SelectItem value="medium" className="text-cyber-yellow">MEDIUM</SelectItem>
                      <SelectItem value="high" className="text-cyber-red">HIGH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-cyber-cyan/60 text-xs font-mono uppercase">Assign Agent</Label>
                <Select value={formData.assignee ?? "unassigned"} onValueChange={(v) => setFormData({ ...formData, assignee: v === "unassigned" ? "" : v })}>
                  <SelectTrigger className="bg-cyber-panel border-cyber-red/30 text-white rounded-none">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent className="bg-cyber-dark border-cyber-red/50 rounded-none max-h-60">
                    <SelectItem value="unassigned" className="text-neutral-500 italic">Unassigned</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.name} className="text-white font-mono">
                        {agent.avatar_emoji || "🤖"} {agent.name}
                        <span className="ml-2 text-xs text-cyber-cyan/50">({agent.status})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full bg-cyber-red hover:bg-cyber-red-dark text-white rounded-none font-bold tracking-wider">
                DEPLOY MISSION
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="bg-cyber-dark border-2 border-cyber-red/50 max-w-[calc(100vw-2rem)] sm:max-w-lg p-0">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyber-red to-transparent" />
            <DialogHeader className="p-6 pb-0 bg-cyber-panel border-b border-cyber-red/30">
              <DialogTitle className="text-lg font-bold text-white tracking-wider uppercase">
                Edit Mission
              </DialogTitle>
              <DialogDescription className="text-cyber-cyan/60 text-xs font-mono">
                Update mission details and assignment
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateTask} className="space-y-4 p-6">
              <div>
                <Label className="text-cyber-cyan/60 text-xs font-mono uppercase">Mission Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="bg-cyber-panel border-cyber-red/30 text-white focus:border-cyber-red rounded-none"
                  required
                />
              </div>
              <div>
                <Label className="text-cyber-cyan/60 text-xs font-mono uppercase">Briefing</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-cyber-panel border-cyber-red/30 text-white focus:border-cyber-red rounded-none min-h-[120px] font-mono text-sm"
                  placeholder="Mission details and objectives..."
                />
              </div>
              <div>
                <Label className="text-cyber-cyan/60 text-xs font-mono uppercase">Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-mono bg-cyber-panel border-cyber-red/30 text-white hover:bg-cyber-panel hover:border-cyber-cyan rounded-none"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-cyber-cyan" />
                      {formData.due_date ? format(formData.due_date, "PPP") : <span className="text-cyber-cyan/50">Set deadline...</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-cyber-dark border-cyber-red/50 rounded-none">
                    <Calendar
                      mode="single"
                      selected={formData.due_date}
                      onSelect={(date) => setFormData({ ...formData, due_date: date })}
                      initialFocus
                      className="bg-cyber-dark text-white font-mono"
                      classNames={{
                        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                        month: "space-y-4",
                        caption: "flex justify-center pt-1 relative items-center text-cyber-cyan",
                        caption_label: "text-sm font-bold uppercase tracking-wider",
                        nav: "space-x-1 flex items-center",
                        nav_button: "h-7 w-7 bg-transparent p-0 text-cyber-cyan hover:text-cyber-red border border-cyber-red/30 hover:border-cyber-red",
                        nav_button_previous: "absolute left-1",
                        nav_button_next: "absolute right-1",
                        table: "w-full border-collapse space-y-1",
                        head_row: "flex",
                        head_cell: "text-cyber-cyan/60 rounded-none w-9 font-mono text-[0.7rem] uppercase",
                        row: "flex w-full mt-2",
                        cell: "h-9 w-9 text-center text-sm p-0 relative hover:bg-cyber-red/10",
                        day: "h-9 w-9 p-0 font-mono text-white hover:bg-cyber-red/20 hover:text-cyber-cyan aria-selected:bg-cyber-red aria-selected:text-white",
                        day_selected: "bg-cyber-red text-white hover:bg-cyber-red hover:text-white font-bold",
                        day_today: "bg-cyber-cyan/20 text-cyber-cyan font-bold",
                        day_outside: "text-cyber-cyan/20 opacity-50",
                        day_disabled: "text-cyber-cyan/20 opacity-30",
                        day_hidden: "invisible",
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-cyber-cyan/60 text-xs font-mono uppercase">Status</Label>
                  <Select value={formData.column_status} onValueChange={(v) => setFormData({ ...formData, column_status: v as Task["column_status"] })}>
                    <SelectTrigger className="bg-cyber-panel border-cyber-red/30 text-white rounded-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-cyber-dark border-cyber-red/50 rounded-none">
                      {COLUMNS.map((col) => <SelectItem key={col.id} value={col.id} className="text-white">{col.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-cyber-cyan/60 text-xs font-mono uppercase">Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v as Task["priority"] })}>
                    <SelectTrigger className="bg-cyber-panel border-cyber-red/30 text-white rounded-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-cyber-dark border-cyber-red/50 rounded-none">
                      <SelectItem value="low" className="text-cyber-cyan">LOW</SelectItem>
                      <SelectItem value="medium" className="text-cyber-yellow">MEDIUM</SelectItem>
                      <SelectItem value="high" className="text-cyber-red">HIGH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-cyber-cyan/60 text-xs font-mono uppercase">Assign Agent</Label>
                <Select value={formData.assignee ?? "unassigned"} onValueChange={(v) => setFormData({ ...formData, assignee: v === "unassigned" ? "" : v })}>
                  <SelectTrigger className="bg-cyber-panel border-cyber-red/30 text-white rounded-none">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent className="bg-cyber-dark border-cyber-red/50 rounded-none max-h-60">
                    <SelectItem value="unassigned" className="text-neutral-500 italic">Unassigned</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.name} className="text-white font-mono">
                        {agent.avatar_emoji || "🤖"} {agent.name}
                        <span className="ml-2 text-xs text-cyber-cyan/50">({agent.status})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subscription Section */}
              <div className="border-t border-cyber-red/30 pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-cyber-cyan" />
                    <Label className="text-cyber-cyan/60 text-xs font-mono uppercase">
                      Watching ({subscribers.length})
                    </Label>
                  </div>
                  {currentAgent && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleToggleSubscription}
                      className={`h-7 text-xs rounded-none border-cyber-red/30 font-mono ${
                        isSubscribed 
                          ? 'bg-cyber-cyan/10 text-cyber-cyan hover:bg-cyber-red/20 hover:text-cyber-red' 
                          : 'text-cyber-cyan/60 hover:bg-cyber-cyan/10 hover:text-cyber-cyan'
                      }`}
                    >
                      {isSubscribed ? (
                        <>
                          <EyeOff className="h-3 w-3 mr-1" />
                          UNSUBSCRIBE
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3 mr-1" />
                          SUBSCRIBE
                        </>
                      )}
                    </Button>
                  )}
                </div>
                {subscribers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {subscribers.map((sub) => (
                      <Badge
                        key={sub.id}
                        variant="outline"
                        className="text-[10px] px-2 py-0.5 bg-cyber-panel border-cyber-red/30 text-cyber-cyan/80 font-mono"
                      >
                        {sub.agent_avatar ? sub.agent_avatar : '🤖'} {sub.agent_name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Comment Section */}
              <div className="border-t border-cyber-red/30 pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="h-4 w-4 text-cyber-cyan" />
                  <Label className="text-cyber-cyan/60 text-xs font-mono uppercase">
                    Mission Comms ({comments.length})
                  </Label>
                </div>

                {/* Comments List */}
                <ScrollArea className="h-48 mb-3 bg-cyber-panel/30 border border-cyber-red/20 p-3">
                  {comments.length === 0 ? (
                    <div className="text-center py-8 text-cyber-cyan/30 font-mono text-xs">
                      NO_COMMS_YET
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {comments.map((comment) => (
                        <div key={comment.id} className="bg-cyber-panel/50 border border-cyber-red/20 p-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-cyber-cyan">@{comment.author}</span>
                            <span className="text-[10px] text-cyber-cyan/40 font-mono">
                              {format(new Date(comment.created_at), 'MMM dd, HH:mm')}
                            </span>
                          </div>
                          <p 
                            className="text-sm text-white/80 font-mono"
                            dangerouslySetInnerHTML={{ __html: highlightMentions(comment.message) }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Add Comment */}
                <div className="flex gap-2">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                    placeholder="@mention agents, share updates..."
                    className="flex-1 bg-cyber-panel border-cyber-red/30 text-white focus:border-cyber-red rounded-none font-mono text-sm"
                  />
                  <Button
                    type="button"
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="bg-cyber-cyan hover:bg-cyber-cyan/80 text-cyber-dark rounded-none"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-cyber-red/30">
                <Button type="submit" className="flex-1 bg-cyber-red hover:bg-cyber-red-dark text-white rounded-none font-bold tracking-wider">
                  UPDATE
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-cyber-red/50 text-cyber-red hover:bg-cyber-red/10 rounded-none"
                  onClick={async () => {
                    if (!selectedTask) return;
                    await supabase.from("tasks").delete().eq("id", selectedTask.id);
                    setSelectedTask(null);
                  }}
                >
                  DELETE
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  }
}
