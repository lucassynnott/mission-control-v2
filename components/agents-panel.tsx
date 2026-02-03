"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Bot, Loader2, Cpu, Shield, UserPlus } from "lucide-react";
import { CreateAgentWizard } from "./wizard/create-agent-wizard";
import { supabase, Agent, Task } from "@/lib/supabase";

interface AgentsPanelProps {
  isMobile?: boolean;
}

// Cyberpunk status colors
const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-cyber-cyan/20 text-cyber-cyan border-cyber-cyan/50';
    case 'idle': return 'bg-cyber-yellow/20 text-cyber-yellow border-cyber-yellow/50';
    case 'blocked': return 'bg-cyber-red/20 text-cyber-red border-cyber-red/50';
    default: return 'bg-cyber-panel border-cyber-red/30 text-cyber-cyan/60';
  }
};

// Cyberpunk card component with corner brackets
function CyberCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative bg-cyber-panel border border-cyber-red/30 ${className}`}>
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-3 h-3 border-l border-t border-cyber-red" />
      <div className="absolute top-0 right-0 w-3 h-3 border-r border-t border-cyber-red" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-l border-b border-cyber-red" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-r border-b border-cyber-red" />
      {children}
    </div>
  );
}

// Helper to format tokens nicely
function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  } else if (tokens >= 1000) {
    return `${Math.round(tokens / 1000)}K`;
  }
  return tokens.toString();
}

// Helper to calculate time ago
function timeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  
  if (seconds < 60) return 'Active now';
  if (seconds < 120) return 'Active 1m ago';
  if (seconds < 3600) return `Active ${Math.floor(seconds / 60)}m ago`;
  if (seconds < 7200) return 'Last seen 1h ago';
  if (seconds < 86400) return `Last seen ${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 172800) return 'Last seen 1d ago';
  return `Last seen ${Math.floor(seconds / 86400)}d ago`;
}

export function AgentsPanel({ isMobile }: AgentsPanelProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskTitles, setTaskTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [assigningAgent, setAssigningAgent] = useState<Agent | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  useEffect(() => {
    fetchAgents();
    fetchTasks();

    const agentsChannel = supabase
      .channel('agents-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agents' },
        () => fetchAgents()
      )
      .subscribe();

    const tasksChannel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => fetchTasks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(agentsChannel);
      supabase.removeChannel(tasksChannel);
    };
  }, []);

  async function fetchAgents() {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching agents:', error);
        return;
      }

      setAgents(data || []);
      
      // Fetch task titles for agents with current_task_id
      const agentTaskIds = (data || [])
        .filter(a => a.current_task_id)
        .map(a => a.current_task_id);
      
      if (agentTaskIds.length > 0) {
        const { data: taskData } = await supabase
          .from('tasks')
          .select('id, title')
          .in('id', agentTaskIds);
        
        if (taskData) {
          const titleMap: Record<string, string> = {};
          taskData.forEach(t => {
            titleMap[t.id] = t.title;
          });
          setTaskTitles(titleMap);
        }
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTasks() {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tasks:', error);
        return;
      }

      setTasks(data || []);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  }

  async function handleAssignTask() {
    if (!assigningAgent || !selectedTaskId) return;

    try {
      // Update agent's current_task_id
      const { error: agentError } = await supabase
        .from('agents')
        .update({ 
          current_task_id: selectedTaskId,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', assigningAgent.id);

      if (agentError) {
        console.error('Error updating agent:', agentError);
        return;
      }

      // Update task's assignee and status
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ 
          assignee: assigningAgent.name,
          column_status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTaskId);

      if (taskError) {
        console.error('Error updating task:', taskError);
        return;
      }

      setAssigningAgent(null);
      setSelectedTaskId('');
    } catch (err) {
      console.error('Failed to assign task:', err);
    }
  }

  return (
    <>
      <div className={`${isMobile ? '' : ''} bg-cyber-dark flex flex-col h-full`}>
        {/* Header */}
        <div className="p-4 border-b border-cyber-red/30 bg-cyber-panel">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-cyber-red" />
              <div>
                <h2 className="text-sm font-bold text-white tracking-wider">AGENT UNITS</h2>
                <p className="text-[10px] text-cyber-cyan/60 font-mono">{agents.length} UNITS ONLINE</p>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0 text-cyber-red hover:text-cyber-red hover:bg-cyber-red/10"
              onClick={() => setShowWizard(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Agent List */}
        <div className={`flex-1 overflow-auto space-y-2 p-3 ${isMobile ? '' : ''}`}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-cyber-red" />
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="h-8 w-8 text-cyber-red/30 mx-auto mb-2" />
              <p className="text-xs text-cyber-cyan/40 font-mono uppercase">No units deployed</p>
            </div>
          ) : (
            agents.map((agent) => (
              <CyberCard key={agent.id} className="p-3 hover:border-cyber-red/60 transition-colors group">
                <div className="flex items-start gap-3">
                  {/* Avatar with glow effect */}
                  <div className="relative">
                    <Avatar className="h-10 w-10 bg-cyber-panel border border-cyber-red/50">
                      <AvatarFallback className="text-sm bg-cyber-dark text-cyber-cyan font-bold">
                        {agent.avatar_emoji || <Bot className="h-5 w-5" />}
                      </AvatarFallback>
                    </Avatar>
                    {/* Status indicator with animation for active */}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-cyber-dark ${
                      agent.status === 'active' ? 'bg-cyber-cyan shadow-[0_0_8px_rgba(0,240,255,0.8)] animate-pulse' :
                      agent.status === 'idle' ? 'bg-cyber-yellow shadow-[0_0_8px_rgba(255,204,0,0.8)]' :
                      'bg-cyber-red shadow-[0_0_8px_rgba(255,0,60,0.8)]'
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white tracking-wide truncate group-hover:text-cyber-cyan transition-colors">
                          {agent.name}
                        </span>
                        {agent.level && (
                          <Badge
                            variant="outline"
                            className={`text-[9px] h-4 px-1 font-mono uppercase tracking-wider ${
                              agent.level === 'lead' ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' :
                              agent.level === 'specialist' ? 'bg-cyber-cyan/20 text-cyber-cyan border-cyber-cyan/50' :
                              'bg-cyber-yellow/20 text-cyber-yellow border-cyber-yellow/50'
                            }`}
                          >
                            {agent.level}
                          </Badge>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-5 px-1.5 font-mono uppercase tracking-wider ${getStatusColor(agent.status)}`}
                      >
                        {agent.status}
                      </Badge>
                    </div>

                    <div className="text-xs text-cyber-cyan/60 mt-1 font-mono">
                      MDL://{agent.model.toUpperCase().replace(/\s+/g, '_')}
                    </div>

                    {/* Current Task Display */}
                    {agent.current_task_id && taskTitles[agent.current_task_id] && (
                      <div className="mt-2 p-1.5 bg-cyber-red/10 border border-cyber-red/30">
                        <div className="flex items-center gap-1 text-[10px] text-cyber-red font-mono mb-0.5">
                          <span className="animate-pulse">●</span>
                          <span>ACTIVE_TASK</span>
                        </div>
                        <div className="text-xs text-white/90 truncate">
                          {taskTitles[agent.current_task_id]}
                        </div>
                      </div>
                    )}

                    {/* Stats Row */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-[10px] text-cyber-cyan/40 font-mono">
                          <span>TOK:</span>
                          <span className="text-cyber-yellow">{formatTokens(agent.tokens_used)}</span>
                        </div>
                        <div className="text-[10px] text-cyber-cyan/40 font-mono">
                          {timeAgo(agent.updated_at)}
                        </div>
                      </div>
                    </div>

                    {/* Assign Task Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2 h-7 text-[10px] border-cyber-cyan/30 text-cyber-cyan/60 hover:text-cyber-cyan hover:border-cyber-cyan hover:bg-cyber-cyan/5 font-mono tracking-wider uppercase"
                      onClick={() => setAssigningAgent(agent)}
                    >
                      <UserPlus className="h-3 w-3 mr-1" />
                      Assign Task
                    </Button>
                  </div>
                </div>
              </CyberCard>
            ))
          )}

          {/* Deploy New Button */}
          <Button
            variant="outline"
            className="w-full mt-4 border-dashed border-cyber-red/40 text-cyber-red/60 hover:text-cyber-red hover:border-cyber-red hover:bg-cyber-red/5 font-mono text-xs tracking-wider uppercase"
            onClick={() => setShowWizard(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Deploy Unit
          </Button>
        </div>
      </div>

      {/* Wizard Dialog */}
      <Dialog open={showWizard} onOpenChange={setShowWizard}>
        <DialogContent className="max-w-2xl bg-cyber-dark border-2 border-cyber-red/50 p-0">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyber-red to-transparent" />
          <DialogHeader className="p-6 pb-0 bg-cyber-panel border-b border-cyber-red/30">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-cyber-red" />
              <DialogTitle className="text-lg font-bold text-white tracking-wider uppercase">
                Deploy New Agent
              </DialogTitle>
            </div>
          </DialogHeader>
          <CreateAgentWizard onComplete={() => { setShowWizard(false); fetchAgents(); }} />
        </DialogContent>
      </Dialog>

      {/* Task Assignment Dialog */}
      <Dialog open={!!assigningAgent} onOpenChange={() => { setAssigningAgent(null); setSelectedTaskId(''); }}>
        <DialogContent className="max-w-lg bg-cyber-dark border-2 border-cyber-red/50 p-0">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyber-red to-transparent" />
          <DialogHeader className="p-6 pb-0 bg-cyber-panel border-b border-cyber-red/30">
            <div className="flex items-center gap-3">
              <UserPlus className="h-6 w-6 text-cyber-red" />
              <DialogTitle className="text-lg font-bold text-white tracking-wider uppercase">
                Assign Task to {assigningAgent?.name}
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div>
              <Label className="text-cyber-cyan/60 text-xs font-mono uppercase">Select Task</Label>
              <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                <SelectTrigger className="bg-cyber-panel border-cyber-red/30 text-white rounded-none mt-2">
                  <SelectValue placeholder="Choose a task..." />
                </SelectTrigger>
                <SelectContent className="bg-cyber-dark border-cyber-red/50 rounded-none max-h-60">
                  {tasks.filter(t => t.column_status !== 'done').map((task) => (
                    <SelectItem key={task.id} value={task.id} className="text-white font-mono">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] h-5 px-1.5 font-mono uppercase ${
                            task.priority === 'high' ? 'bg-cyber-red/20 text-cyber-red border-cyber-red/50' :
                            task.priority === 'medium' ? 'bg-cyber-yellow/20 text-cyber-yellow border-cyber-yellow/50' :
                            'bg-cyber-cyan/20 text-cyber-cyan border-cyber-cyan/50'
                          }`}
                        >
                          {task.priority}
                        </Badge>
                        <span className="truncate">{task.title}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-cyber-red/30 text-cyber-cyan/60 hover:text-cyber-cyan hover:border-cyber-cyan rounded-none font-mono tracking-wider uppercase"
                onClick={() => { setAssigningAgent(null); setSelectedTaskId(''); }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-cyber-red hover:bg-cyber-red-dark text-white rounded-none font-bold tracking-wider uppercase"
                onClick={handleAssignTask}
                disabled={!selectedTaskId}
              >
                Assign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
