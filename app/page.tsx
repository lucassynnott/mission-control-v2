"use client";

import { useState, useEffect } from "react";
import { AgentsPanel } from "@/components/agents-panel";
import { KanbanBoard } from "@/components/kanban-board";
import { ActivityFeed } from "@/components/activity-feed";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { Menu, Bot, Columns, Activity } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Force dynamic rendering to avoid build-time Supabase issues
export const dynamic = 'force-dynamic';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'agents' | 'kanban' | 'activity'>('kanban');
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Desktop layout
  if (!isMobile) {
    return (
      <div className="h-screen flex flex-col bg-neutral-950">
        {/* Header */}
        <header className="h-14 border-b border-neutral-800 flex items-center px-4 bg-neutral-900">
          <h1 className="text-lg font-semibold text-neutral-100">Mission Control v2.0</h1>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell userId="lucas" />
            <span className="text-xs text-neutral-400 hidden sm:inline">🟢 Online</span>
          </div>
        </header>

        {/* Three-Column Layout */}
        <div className="flex-1 grid grid-cols-[260px_1fr_280px] overflow-hidden">
          <AgentsPanel />
          <KanbanBoard />
          <ActivityFeed />
        </div>
      </div>
    );
  }

  // Mobile layout with tab navigation
  return (
    <div className="h-screen flex flex-col bg-neutral-950">
      {/* Mobile Header */}
      <header className="h-14 border-b border-neutral-800 flex items-center px-3 bg-neutral-900">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2">
              <Menu className="h-5 w-5 text-neutral-400" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] bg-neutral-900 border-neutral-800 p-0">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-neutral-800">
                <h2 className="text-lg font-semibold text-neutral-100">Mission Control</h2>
                <p className="text-xs text-neutral-500">v2.0 Mobile</p>
              </div>
              <nav className="flex-1 p-2">
                <Button
                  variant={activeTab === 'agents' ? 'default' : 'ghost'}
                  className="w-full justify-start mb-1"
                  onClick={() => { setActiveTab('agents'); setMobileMenuOpen(false); }}
                >
                  <Bot className="h-4 w-4 mr-2" />
                  Agents
                </Button>
                <Button
                  variant={activeTab === 'kanban' ? 'default' : 'ghost'}
                  className="w-full justify-start mb-1"
                  onClick={() => { setActiveTab('kanban'); setMobileMenuOpen(false); }}
                >
                  <Columns className="h-4 w-4 mr-2" />
                  Tasks
                </Button>
                <Button
                  variant={activeTab === 'activity' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => { setActiveTab('activity'); setMobileMenuOpen(false); }}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Activity
                </Button>
              </nav>
            </div>
          </SheetContent>
        </Sheet>

        <h1 className="text-base font-semibold text-neutral-100 flex-1">
          {activeTab === 'agents' && 'Agents'}
          {activeTab === 'kanban' && 'Tasks'}
          {activeTab === 'activity' && 'Activity'}
        </h1>
        
        <NotificationBell userId="lucas" />
      </header>

      {/* Mobile Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'agents' && <AgentsPanel isMobile />}
        {activeTab === 'kanban' && <KanbanBoard isMobile />}
        {activeTab === 'activity' && <ActivityFeed isMobile />}
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav className="h-14 border-t border-neutral-800 bg-neutral-900 flex items-center justify-around px-2">
        <Button
          variant="ghost"
          size="sm"
          className={`flex-col h-12 px-3 ${activeTab === 'agents' ? 'text-blue-400' : 'text-neutral-500'}`}
          onClick={() => setActiveTab('agents')}
        >
          <Bot className="h-5 w-5 mb-0.5" />
          <span className="text-[10px]">Agents</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`flex-col h-12 px-3 ${activeTab === 'kanban' ? 'text-blue-400' : 'text-neutral-500'}`}
          onClick={() => setActiveTab('kanban')}
        >
          <Columns className="h-5 w-5 mb-0.5" />
          <span className="text-[10px]">Tasks</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`flex-col h-12 px-3 ${activeTab === 'activity' ? 'text-blue-400' : 'text-neutral-500'}`}
          onClick={() => setActiveTab('activity')}
        >
          <Activity className="h-5 w-5 mb-0.5" />
          <span className="text-[10px]">Activity</span>
        </Button>
      </nav>
    </div>
  );
}
