import React, { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  ChevronDown, 
  FileCode, 
  Database, 
  Shield, 
  Workflow, 
  Settings,
  Tv,
  Gamepad2,
  Box,
  GitBranch,
  Code2,
  Layers,
  BookOpen,
  ArrowLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import {
  TV_PAGES,
  TV_COMPONENTS,
  CONTROLLER_COMPONENTS,
  TV_CONTEXTS,
  TV_HOOKS,
  DATABASE_TABLES,
  RLS_POLICIES,
  DATABASE_FUNCTIONS,
  TV_UTILITIES,
  DATA_FLOWS,
  PHASE_STATE_MACHINE,
  CONFIG_CONSTANTS,
  DocItem,
  DatabaseTable,
  RLSPolicy,
  DataFlow,
} from '@/data/documentation/tvModeComplete';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language = 'typescript' }) => (
  <pre className="bg-slate-900 rounded-lg p-4 overflow-x-auto text-sm">
    <code className="text-slate-200 font-mono whitespace-pre">{code}</code>
  </pre>
);

const DocItemCard: React.FC<{ item: DocItem; defaultOpen?: boolean }> = ({ item, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="mb-4 bg-card/50 border-border/50">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileCode className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg text-left">{item.name}</CardTitle>
                {item.lines && (
                  <Badge variant="secondary" className="text-xs">
                    {item.lines} lines
                  </Badge>
                )}
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            <CardDescription className="text-left text-xs font-mono text-muted-foreground">
              {item.path}
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <p className="text-sm text-foreground/80 whitespace-pre-line">{item.description}</p>
            
            {item.exports && item.exports.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-foreground">Exports</h4>
                <div className="flex flex-wrap gap-2">
                  {item.exports.map((exp, i) => (
                    <Badge key={i} variant="outline" className="text-xs font-mono">
                      {exp}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {item.keyFunctions && item.keyFunctions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-foreground">Key Functions</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {item.keyFunctions.map((fn, i) => (
                    <li key={i} className="font-mono text-xs">• {fn}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {item.dependencies && item.dependencies.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-foreground">Dependencies</h4>
                <div className="flex flex-wrap gap-1">
                  {item.dependencies.map((dep, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {dep}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {item.relatedItems && item.relatedItems.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-foreground">Related</h4>
                <div className="flex flex-wrap gap-1">
                  {item.relatedItems.map((rel, i) => (
                    <Badge key={i} variant="outline" className="text-xs text-primary">
                      {rel}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {item.codeExample && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-foreground">Example</h4>
                <CodeBlock code={item.codeExample} />
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

const TableCard: React.FC<{ table: DatabaseTable }> = ({ table }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="mb-4 bg-card/50 border-border/50">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-green-500" />
                <CardTitle className="text-lg text-left">{table.name}</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {table.columns.length} columns
                </Badge>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <p className="text-sm text-foreground/80">{table.description}</p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 font-semibold">Column</th>
                    <th className="text-left py-2 px-2 font-semibold">Type</th>
                    <th className="text-left py-2 px-2 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {table.columns.map((col, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 px-2 font-mono text-xs text-primary">{col.name}</td>
                      <td className="py-2 px-2 font-mono text-xs text-muted-foreground">{col.type}</td>
                      <td className="py-2 px-2 text-xs">{col.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {table.relatedTables && table.relatedTables.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Related Tables</h4>
                <div className="flex flex-wrap gap-1">
                  {table.relatedTables.map((rel, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {rel}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

const PolicyCard: React.FC<{ policy: RLSPolicy }> = ({ policy }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const opColor = {
    SELECT: 'text-blue-400',
    INSERT: 'text-green-400',
    UPDATE: 'text-yellow-400',
    DELETE: 'text-red-400',
  }[policy.operation];
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="mb-2 bg-card/50 border-border/50">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-left">{policy.name}</span>
                <Badge variant="outline" className={`text-xs ${opColor}`}>
                  {policy.operation}
                </Badge>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            <p className="text-xs text-muted-foreground">{policy.description}</p>
            <CodeBlock code={policy.sql} language="sql" />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

const FlowCard: React.FC<{ flow: DataFlow }> = ({ flow }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="mb-4 bg-card/50 border-border/50">
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Workflow className="h-5 w-5 text-cyan-400" />
                <CardTitle className="text-lg text-left">{flow.name}</CardTitle>
              </div>
              <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <p className="text-sm text-foreground/80">{flow.description}</p>
            <CodeBlock code={flow.mermaidDiagram} language="mermaid" />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const TVModeGameDocs: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Filter function
  const filterItems = <T extends { name?: string; description?: string; path?: string }>(
    items: T[],
    query: string
  ): T[] => {
    if (!query.trim()) return items;
    const lower = query.toLowerCase();
    return items.filter(item => 
      item.name?.toLowerCase().includes(lower) ||
      item.description?.toLowerCase().includes(lower) ||
      item.path?.toLowerCase().includes(lower)
    );
  };
  
  // Filtered data
  const filteredPages = useMemo(() => filterItems(TV_PAGES, searchQuery), [searchQuery]);
  const filteredTVComponents = useMemo(() => filterItems(TV_COMPONENTS, searchQuery), [searchQuery]);
  const filteredControllerComponents = useMemo(() => filterItems(CONTROLLER_COMPONENTS, searchQuery), [searchQuery]);
  const filteredContexts = useMemo(() => filterItems(TV_CONTEXTS, searchQuery), [searchQuery]);
  const filteredHooks = useMemo(() => filterItems(TV_HOOKS, searchQuery), [searchQuery]);
  const filteredTables = useMemo(() => filterItems(DATABASE_TABLES, searchQuery), [searchQuery]);
  const filteredPolicies = useMemo(() => {
    if (!searchQuery.trim()) return RLS_POLICIES;
    const lower = searchQuery.toLowerCase();
    return RLS_POLICIES.filter(p => 
      p.name.toLowerCase().includes(lower) ||
      p.table.toLowerCase().includes(lower) ||
      p.description.toLowerCase().includes(lower)
    );
  }, [searchQuery]);
  const filteredFunctions = useMemo(() => filterItems(DATABASE_FUNCTIONS, searchQuery), [searchQuery]);
  const filteredUtilities = useMemo(() => filterItems(TV_UTILITIES, searchQuery), [searchQuery]);
  const filteredFlows = useMemo(() => filterItems(DATA_FLOWS, searchQuery), [searchQuery]);
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'pages', label: 'Pages', icon: Layers, count: TV_PAGES.length },
    { id: 'tv-components', label: 'TV Components', icon: Tv, count: TV_COMPONENTS.length },
    { id: 'controller', label: 'Controller', icon: Gamepad2, count: CONTROLLER_COMPONENTS.length },
    { id: 'contexts', label: 'Contexts', icon: Box, count: TV_CONTEXTS.length },
    { id: 'hooks', label: 'Hooks', icon: GitBranch, count: TV_HOOKS.length },
    { id: 'tables', label: 'Tables', icon: Database, count: DATABASE_TABLES.length },
    { id: 'rls', label: 'RLS Policies', icon: Shield, count: RLS_POLICIES.length },
    { id: 'functions', label: 'DB Functions', icon: Code2, count: DATABASE_FUNCTIONS.length },
    { id: 'utilities', label: 'Utilities', icon: Settings, count: TV_UTILITIES.length },
    { id: 'flows', label: 'Data Flows', icon: Workflow, count: DATA_FLOWS.length },
    { id: 'phases', label: 'Phase Machine', icon: GitBranch },
    { id: 'config', label: 'Config', icon: Settings, count: CONFIG_CONSTANTS.length },
  ];
  
  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/admin')}
            className="shrink-0 p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">TV Mode Game Documentation</h1>
            <p className="text-muted-foreground text-sm">Complete reference for the TV game system</p>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search components, functions, tables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <ScrollArea className="w-full">
            <TabsList className="inline-flex h-auto p-1 mb-6 bg-muted/50 flex-wrap gap-1">
              {tabs.map(tab => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2 px-3 py-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <tab.icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.count !== undefined && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {tab.count}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>
          
          {/* Tab Contents */}
          <TabsContent value="overview" className="mt-0">
            <div className="space-y-6">
              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle>Architecture Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Pages', count: 5, color: 'text-blue-400' },
                      { label: 'TV Components', count: 25, color: 'text-purple-400' },
                      { label: 'Controller Components', count: 12, color: 'text-green-400' },
                      { label: 'Hooks', count: 3, color: 'text-yellow-400' },
                      { label: 'Database Tables', count: 7, color: 'text-cyan-400' },
                      { label: 'RLS Policies', count: 21, color: 'text-red-400' },
                      { label: 'DB Functions', count: 2, color: 'text-orange-400' },
                      { label: 'Utilities', count: 2, color: 'text-pink-400' },
                    ].map((stat, i) => (
                      <div key={i} className="bg-muted/50 rounded-lg p-4 text-center">
                        <div className={`text-2xl font-bold ${stat.color}`}>{stat.count}</div>
                        <div className="text-xs text-muted-foreground">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="prose prose-sm prose-invert max-w-none">
                    <h3>Key Concepts</h3>
                    <ul>
                      <li><strong>Sessions</strong> - A TV game instance with pairing codes (6-char and 4-digit)</li>
                      <li><strong>Players</strong> - Registered participants (authenticated or guest) with scores</li>
                      <li><strong>Phases</strong> - 15 game states controlling UI and logic flow</li>
                      <li><strong>Polls</strong> - Category voting system for democratic round selection</li>
                      <li><strong>Queue</strong> - Ordered list of rounds to play in multi-round games</li>
                      <li><strong>Presence</strong> - Real-time player connection and answer tracking</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle>Quick Reference - File Paths</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4 text-xs font-mono">
                    <div>
                      <h4 className="text-sm font-semibold mb-2 text-foreground">Core Files</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>src/contexts/TVGameContext.tsx</li>
                        <li>src/hooks/useTVPoll.ts</li>
                        <li>src/hooks/useTVSessionQueue.ts</li>
                        <li>src/hooks/useTVDiscovery.ts</li>
                        <li>src/utils/tvDebug.ts</li>
                        <li>src/utils/tvScoring.ts</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-2 text-foreground">Pages</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>src/pages/TVDisplay.tsx - /tv/:code?</li>
                        <li>src/pages/TVLobby.tsx - /tv</li>
                        <li>src/pages/TVHostController.tsx - /tv/host/:sessionId</li>
                        <li>src/pages/TVJoin.tsx - /join/:code?</li>
                        <li>src/pages/TVScreensShowcase.tsx - /tv-showcase</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="pages" className="mt-0">
            <div className="space-y-4">
              {filteredPages.map((item, i) => (
                <DocItemCard key={i} item={item} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="tv-components" className="mt-0">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">TV Display Components ({filteredTVComponents.length})</h3>
              {filteredTVComponents.map((item, i) => (
                <DocItemCard key={i} item={item} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="controller" className="mt-0">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Controller Components ({filteredControllerComponents.length})</h3>
              {filteredControllerComponents.map((item, i) => (
                <DocItemCard key={i} item={item} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="contexts" className="mt-0">
            <div className="space-y-4">
              {filteredContexts.map((item, i) => (
                <DocItemCard key={i} item={item} defaultOpen={true} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="hooks" className="mt-0">
            <div className="space-y-4">
              {filteredHooks.map((item, i) => (
                <DocItemCard key={i} item={item} defaultOpen={true} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="tables" className="mt-0">
            <div className="space-y-4">
              {filteredTables.map((table, i) => (
                <TableCard key={i} table={table} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="rls" className="mt-0">
            <div className="space-y-4">
              {/* Group by table */}
              {Array.from(new Set(filteredPolicies.map(p => p.table))).map(tableName => (
                <div key={tableName} className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Database className="h-4 w-4 text-green-500" />
                    {tableName}
                  </h3>
                  {filteredPolicies
                    .filter(p => p.table === tableName)
                    .map((policy, i) => (
                      <PolicyCard key={i} policy={policy} />
                    ))}
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="functions" className="mt-0">
            <div className="space-y-4">
              {filteredFunctions.map((item, i) => (
                <DocItemCard key={i} item={item} defaultOpen={true} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="utilities" className="mt-0">
            <div className="space-y-4">
              {filteredUtilities.map((item, i) => (
                <DocItemCard key={i} item={item} defaultOpen={true} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="flows" className="mt-0">
            <div className="space-y-4">
              {filteredFlows.map((flow, i) => (
                <FlowCard key={i} flow={flow} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="phases" className="mt-0">
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle>Phase State Machine</CardTitle>
                <CardDescription>
                  All possible phase transitions in the TV game lifecycle
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CodeBlock code={PHASE_STATE_MACHINE} language="mermaid" />
                
                <div className="mt-6">
                  <h4 className="text-sm font-semibold mb-3">Phase Descriptions</h4>
                  <div className="grid md:grid-cols-2 gap-2 text-sm">
                    {[
                      { phase: 'pairing', desc: 'Initial state - TV showing pairing code' },
                      { phase: 'waiting', desc: 'Session created, waiting for host' },
                      { phase: 'lobby', desc: 'Host paired, players can join' },
                      { phase: 'countdown', desc: '3-2-1 countdown before questions' },
                      { phase: 'question', desc: 'Question displayed, players answering' },
                      { phase: 'reveal', desc: 'Correct answer highlighted briefly' },
                      { phase: 'results', desc: 'End of round leaderboard' },
                      { phase: 'completed', desc: 'All rounds finished' },
                      { phase: 'round-intro', desc: 'Category intro between rounds' },
                      { phase: 'poll-suggest', desc: 'Host adding category suggestions' },
                      { phase: 'poll-voting', desc: 'Players voting (30s timer)' },
                      { phase: 'poll-results', desc: 'Showing voting winners' },
                      { phase: 'category-select', desc: 'Direct category selection (no poll)' },
                      { phase: 'idle', desc: 'Inactive screensaver state' },
                      { phase: 'playing', desc: 'Alias for question (DB compatibility)' },
                    ].map((item, i) => (
                      <div key={i} className="flex gap-2">
                        <Badge variant="outline" className="shrink-0 font-mono text-xs">
                          {item.phase}
                        </Badge>
                        <span className="text-muted-foreground text-xs">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="config" className="mt-0">
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle>Configuration Constants</CardTitle>
                <CardDescription>
                  Key timing and limit values used throughout the TV game system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 font-semibold">Constant</th>
                        <th className="text-left py-2 px-2 font-semibold">Value</th>
                        <th className="text-left py-2 px-2 font-semibold">Unit</th>
                        <th className="text-left py-2 px-2 font-semibold">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CONFIG_CONSTANTS.map((config, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2 px-2 font-mono text-xs text-primary">{config.name}</td>
                          <td className="py-2 px-2 font-mono text-xs font-bold">{config.value}</td>
                          <td className="py-2 px-2 text-xs text-muted-foreground">{config.unit}</td>
                          <td className="py-2 px-2 text-xs">{config.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TVModeGameDocs;
