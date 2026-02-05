"use client";

import { useState, useEffect } from "react";
import { AgentsPanel } from "@/components/agents-panel";
import { KanbanBoard } from "@/components/kanban-board";
import { ActivityFeed } from "@/components/activity-feed";
import { DocumentsPanel } from "@/components/documents-panel";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { Menu, Bot, Columns, Activity, Shield, FileText } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Force dynamic rendering to avoid build-time Supabase issues
export const dynamic = 'force-dynamic';

// Cyberpunk HUD Header Component
function CyberHeader({ isMobile = false }: { isMobile?: boolean }) {
  const [currentTime, setCurrentTime] = useState('--:--:--');
  
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    };
    
    updateTime(); // Initial update
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b-2 border-cyber-red/50 bg-cyber-dark relative overflow-hidden">
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyber-red to-transparent" />
      
      {/* Corner brackets */}
      <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-cyber-red" />
      <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-cyber-red" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-cyber-red" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-cyber-red" />
      
      <div className="h-full flex items-center px-4 relative z-10">
        {/* Logo/Title */}
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-cyber-red" />
          <div>
            <h1 className="text-xl font-bold tracking-wider text-white uppercase font-cyber">
              Mission Control
            </h1>
            <div className="flex items-center gap-2 text-[10px] text-cyber-red/80 tracking-widest">
              <span>VER 2.0</span>
              <span className="text-cyber-cyan">{"///"}</span>
              <span>SYSTEM ONLINE</span>
            </div>
          </div>
        </div>
        
        {/* Center status */}
        {!isMobile && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-cyber-panel border border-cyber-red/30">
              <div className="w-2 h-2 bg-cyber-red animate-pulse" />
              <span className="text-xs text-cyber-red font-mono tracking-wider">LIVE</span>
            </div>
            <div className="text-xs text-cyber-cyan/60 font-mono">
              {currentTime}
            </div>
          </div>
        )}
        
        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          <NotificationBell userId="lucas" />
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-cyber-panel border border-cyber-cyan/30">
            <div className="w-2 h-2 rounded-full bg-cyber-cyan animate-pulse" />
            <span className="text-xs text-cyber-cyan font-mono">SECURE</span>
          </div>
        </div>
      </div>
      
      {/* Bottom scanline */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-cyber-red/0 via-cyber-red/50 to-cyber-red/0" />
    </header>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'agents' | 'kanban' | 'activity' | 'documents'>('kanban');
  const [isMobile, setIsMobile] = useState(false); // Default to desktop
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
      <div className="h-screen flex flex-col bg-cyber-dark font-cyber overflow-hidden">
        <CyberHeader />

        {/* Three-Column Layout with cyberpunk borders */}
        <div className="flex-1 grid grid-cols-[280px_minmax(0,1fr)_320px] overflow-hidden w-full" style={{ display: 'grid' }}>
          {/* Left sidebar - Agents */}
          <div className="border-r-2 border-cyber-red/30 relative h-full overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyber-red/50 to-transparent" />
            <div className="h-full overflow-hidden">
              <AgentsPanel />
            </div>
          </div>
          
          {/* Center - Kanban */}
          <div className="relative h-full">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyber-red/30 via-cyber-cyan/30 to-cyber-red/30" />
            <KanbanBoard />
          </div>
          
          {/* Right sidebar - System Logs (top 50%) + Documents (bottom 50%) */}
          <div className="border-l-2 border-cyber-red/30 relative h-full flex-shrink-0 flex flex-col bg-cyber-dark overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-l from-cyber-red/50 to-transparent" />
            
            {/* System Logs - Top Half (50%) */}
            <div className="h-1/2 border-b border-cyber-red/30 flex-shrink-0 flex flex-col overflow-hidden">
              <ActivityFeed />
            </div>
            
            {/* Documents Panel - Bottom Half (50%) */}
            <div className="h-1/2 flex-shrink-0 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-cyber-red/30 bg-cyber-panel flex-shrink-0">
                <h2 className="text-sm font-bold text-white tracking-wider">DOCUMENTS</h2>
                <p className="text-[10px] text-cyber-cyan/60 font-mono">ARCHIVE</p>
              </div>
              <div className="flex-1 overflow-auto">
                <div className="p-3 text-center text-xs text-cyber-cyan/40 font-mono">
                  NO DOCUMENTS
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer status bar */}
        <footer className="h-6 bg-cyber-panel border-t border-cyber-red/30 flex items-center px-4 text-[10px] text-cyber-cyan/60 font-mono">
          <span className="text-cyber-red">SYS://</span>
          <span className="ml-2">AGENT_NETWORK_ACTIVE</span>
          <span className="mx-2 text-cyber-red">|</span>
          <span>TOKENS: 71K</span>
          <span className="mx-2 text-cyber-red">|</span>
          <span>LATENCY: 12ms</span>
          <span className="ml-auto text-cyber-yellow">NEOMILITARISM_UI_V1.0</span>
        </footer>
      </div>
    );
  }

  // Mobile layout with cyberpunk styling
  return (
    <div className="h-screen flex flex-col bg-cyber-dark font-cyber overflow-hidden">
      {/* Mobile Header */}
      <header className="h-14 border-b-2 border-cyber-red/50 bg-cyber-dark relative">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-cyber-red" />
        <div className="h-full flex items-center px-3">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2 text-cyber-red hover:text-cyber-red hover:bg-cyber-red/10">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] bg-cyber-dark border-r-2 border-cyber-red/50 p-0">
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-cyber-red/30 bg-cyber-panel">
                  <h2 className="text-lg font-bold text-white tracking-wider">MISSION CONTROL</h2>
                  <p className="text-xs text-cyber-red font-mono">MOBILE_INTERFACE_V2.0</p>
                </div>
                <nav className="flex-1 p-2 space-y-1">
                  <Button
                    variant={activeTab === 'agents' ? 'default' : 'ghost'}
                    className={`w-full justify-start ${activeTab === 'agents' ? 'bg-cyber-red text-white hover:bg-cyber-red-dark' : 'text-cyber-cyan hover:text-cyber-cyan hover:bg-cyber-cyan/10'}`}
                    onClick={() => { setActiveTab('agents'); setMobileMenuOpen(false); }}
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    AGENTS
                  </Button>
                  <Button
                    variant={activeTab === 'kanban' ? 'default' : 'ghost'}
                    className={`w-full justify-start ${activeTab === 'kanban' ? 'bg-cyber-red text-white hover:bg-cyber-red-dark' : 'text-cyber-cyan hover:text-cyber-cyan hover:bg-cyber-cyan/10'}`}
                    onClick={() => { setActiveTab('kanban'); setMobileMenuOpen(false); }}
                  >
                    <Columns className="h-4 w-4 mr-2" />
                    TASKS
                  </Button>
                  <Button
                    variant={activeTab === 'activity' ? 'default' : 'ghost'}
                    className={`w-full justify-start ${activeTab === 'activity' ? 'bg-cyber-red text-white hover:bg-cyber-red-dark' : 'text-cyber-cyan hover:text-cyber-cyan hover:bg-cyber-cyan/10'}`}
                    onClick={() => { setActiveTab('activity'); setMobileMenuOpen(false); }}
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    ACTIVITY
                  </Button>
                  <Button
                    variant={activeTab === 'documents' ? 'default' : 'ghost'}
                    className={`w-full justify-start ${activeTab === 'documents' ? 'bg-cyber-red text-white hover:bg-cyber-red-dark' : 'text-cyber-cyan hover:text-cyber-cyan hover:bg-cyber-cyan/10'}`}
                    onClick={() => { setActiveTab('documents'); setMobileMenuOpen(false); }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    DOCUMENTS
                  </Button>
                </nav>
                <div className="p-4 border-t border-cyber-red/30 text-[10px] text-cyber-cyan/40 font-mono text-center">
                  SECURE CONNECTION ESTABLISHED
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex-1">
            <h1 className="text-base font-bold text-white tracking-wider">
              {activeTab === 'agents' && 'AGENTS'}
              {activeTab === 'kanban' && 'TASKS'}
              {activeTab === 'activity' && 'ACTIVITY'}
              {activeTab === 'documents' && 'DOCUMENTS'}
            </h1>
            <div className="text-[10px] text-cyber-red font-mono">
              {activeTab === 'agents' && 'UNIT_MANAGEMENT'}
              {activeTab === 'kanban' && 'MISSION_BOARD'}
              {activeTab === 'activity' && 'SYSTEM_LOGS'}
              {activeTab === 'documents' && 'FILE_SYSTEM'}
            </div>
          </div>
          
          <NotificationBell userId="lucas" />
        </div>
      </header>

      {/* Mobile Content */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyber-red/5 via-transparent to-transparent pointer-events-none" />
        {activeTab === 'agents' && <AgentsPanel isMobile />}
        {activeTab === 'kanban' && <KanbanBoard isMobile />}
        {activeTab === 'activity' && <ActivityFeed isMobile />}
        {activeTab === 'documents' && <DocumentsPanel isMobile />}
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav className="h-16 border-t-2 border-cyber-red/50 bg-cyber-panel flex items-center justify-around px-1">
        <Button
          variant="ghost"
          size="sm"
          className={`flex-col h-14 px-2 rounded-none border-b-2 ${activeTab === 'agents' ? 'text-cyber-red border-cyber-red bg-cyber-red/10' : 'text-cyber-cyan/60 border-transparent hover:text-cyber-cyan'}`}
          onClick={() => setActiveTab('agents')}
        >
          <Bot className="h-5 w-5 mb-1" />
          <span className="text-[10px] font-mono tracking-wider">AGENTS</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`flex-col h-14 px-2 rounded-none border-b-2 ${activeTab === 'kanban' ? 'text-cyber-red border-cyber-red bg-cyber-red/10' : 'text-cyber-cyan/60 border-transparent hover:text-cyber-cyan'}`}
          onClick={() => setActiveTab('kanban')}
        >
          <Columns className="h-5 w-5 mb-1" />
          <span className="text-[10px] font-mono tracking-wider">TASKS</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`flex-col h-14 px-2 rounded-none border-b-2 ${activeTab === 'activity' ? 'text-cyber-red border-cyber-red bg-cyber-red/10' : 'text-cyber-cyan/60 border-transparent hover:text-cyber-cyan'}`}
          onClick={() => setActiveTab('activity')}
        >
          <Activity className="h-5 w-5 mb-1" />
          <span className="text-[10px] font-mono tracking-wider">LOGS</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`flex-col h-14 px-2 rounded-none border-b-2 ${activeTab === 'documents' ? 'text-cyber-red border-cyber-red bg-cyber-red/10' : 'text-cyber-cyan/60 border-transparent hover:text-cyber-cyan'}`}
          onClick={() => setActiveTab('documents')}
        >
          <FileText className="h-5 w-5 mb-1" />
          <span className="text-[10px] font-mono tracking-wider">DOCS</span>
        </Button>
      </nav>
    </div>
  );
}
