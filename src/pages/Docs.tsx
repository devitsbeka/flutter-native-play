import { useState } from "react";
import { motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, Database, Code, Layers, Settings, Cpu, GitBranch, Search, Wrench, Workflow } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { ARCHITECTURE_SECTIONS } from "@/data/documentation/architecture";
import { ALL_TABLES, TABLE_CATEGORIES_NAV } from "@/data/documentation/tables";
import { ALL_EDGE_FUNCTIONS, EDGE_FUNCTION_CATEGORIES } from "@/data/documentation/edgeFunctions";
import { ALL_HOOKS, HOOK_CATEGORIES } from "@/data/documentation/hooks";
import { ALL_COMPONENTS, COMPONENT_CATEGORIES } from "@/data/documentation/components";
import { ALL_SERVICES } from "@/data/documentation/services";
import { ALL_CONTEXTS } from "@/data/documentation/contexts";
import { ALL_CONFIGS } from "@/data/documentation/config";
import { UTILITIES, CONSTANTS, TYPE_DEFINITIONS } from "@/data/documentation/utilities";
import { API_FLOWS, DATABASE_RELATIONSHIPS, RLS_POLICY_PATTERNS } from "@/data/documentation/apiFlows";
import { 
  COMPONENTS_GAME, COMPONENTS_HOME, COMPONENTS_TEAM, COMPONENTS_SHOP, 
  COMPONENTS_SOCIAL, COMPONENTS_SHARED, COMPONENTS_TV, COMPONENTS_ADMIN 
} from "@/data/documentation/componentsComplete";

type DocSection = "architecture" | "tables" | "functions" | "hooks" | "components" | "services" | "contexts" | "config" | "utilities" | "apiFlows";

const SECTIONS = [
  { id: "architecture" as const, name: "Architecture", icon: GitBranch },
  { id: "tables" as const, name: "Database Tables", icon: Database },
  { id: "functions" as const, name: "Edge Functions", icon: Cpu },
  { id: "hooks" as const, name: "Hooks", icon: Code },
  { id: "components" as const, name: "Components", icon: Layers },
  { id: "services" as const, name: "Services", icon: Settings },
  { id: "contexts" as const, name: "Contexts", icon: GitBranch },
  { id: "config" as const, name: "Configuration", icon: Settings },
  { id: "utilities" as const, name: "Utilities", icon: Wrench },
  { id: "apiFlows" as const, name: "API Flows", icon: Workflow },
];

export default function Docs() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<DocSection>("architecture");
  const [searchQuery, setSearchQuery] = useState("");

  const renderArchitecture = () => (
    <div className="space-y-8">
      {ARCHITECTURE_SECTIONS.map((section) => (
        <div key={section.id} className="bg-card/50 rounded-xl p-6 border border-border/30">
          <h2 className="text-xl font-bold mb-2">{section.title}</h2>
          <pre className="text-sm text-muted-foreground whitespace-pre-wrap mb-4">
            {section.description}
          </pre>
          {section.subsections?.map((sub, i) => (
            <div key={i} className="mt-4 pl-4 border-l-2 border-primary/30">
              <h3 className="font-semibold">{sub.title}</h3>
              <pre className="text-sm text-muted-foreground whitespace-pre-wrap">{sub.content}</pre>
              {sub.codeExample && (
                <pre className="mt-2 p-3 bg-background/80 rounded-lg text-xs overflow-x-auto">{sub.codeExample}</pre>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  const renderTables = () => {
    const filtered = ALL_TABLES.filter(t => 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return (
      <div className="space-y-4">
        {TABLE_CATEGORIES_NAV.map(cat => {
          const tables = filtered.filter(t => t.category.toLowerCase().replace(/ /g, '-') === cat.id || t.category === cat.name);
          if (tables.length === 0) return null;
          return (
            <div key={cat.id}>
              <h3 className="text-lg font-bold mb-2 text-primary">{cat.name}</h3>
              {tables.map(table => (
                <div key={table.name} className="bg-card/50 rounded-lg p-4 mb-3 border border-border/30">
                  <h4 className="font-mono font-bold text-foreground">{table.name}</h4>
                  <p className="text-sm text-muted-foreground">{table.description}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    <span className="font-semibold">Columns:</span> {table.columns.length} | 
                    {table.realtimeEnabled && <span className="ml-2 text-green-400">● Realtime</span>}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  const renderFunctions = () => {
    const filtered = ALL_EDGE_FUNCTIONS.filter(f => 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return (
      <div className="space-y-4">
        {EDGE_FUNCTION_CATEGORIES.map(cat => {
          const funcs = filtered.filter(f => f.category === cat.name);
          if (funcs.length === 0) return null;
          return (
            <div key={cat.id}>
              <h3 className="text-lg font-bold mb-2 text-primary">{cat.name}</h3>
              {funcs.map(func => (
                <div key={func.name} className="bg-card/50 rounded-lg p-4 mb-3 border border-border/30">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-primary/20 rounded text-xs font-mono">{func.method}</span>
                    <h4 className="font-mono font-bold">{func.name}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{func.description}</p>
                  <div className="mt-2 text-xs">
                    <span className="text-muted-foreground">Returns:</span> <code className="text-primary">{func.returns}</code>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  const renderHooks = () => {
    const filtered = ALL_HOOKS.filter(h => 
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return (
      <div className="space-y-4">
        {HOOK_CATEGORIES.map(cat => {
          const hooks = filtered.filter(h => h.category === cat.name);
          if (hooks.length === 0) return null;
          return (
            <div key={cat.id}>
              <h3 className="text-lg font-bold mb-2 text-primary">{cat.name}</h3>
              {hooks.map(hook => (
                <div key={hook.name} className="bg-card/50 rounded-lg p-4 mb-3 border border-border/30">
                  <h4 className="font-mono font-bold text-foreground">{hook.name}</h4>
                  <p className="text-sm text-muted-foreground">{hook.description}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    <span className="font-semibold">Returns:</span> {hook.returns.length} values
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  };

  const renderComponents = () => {
    const allComponentGroups = [
      { name: "Game", items: COMPONENTS_GAME },
      { name: "Home", items: COMPONENTS_HOME },
      { name: "Team", items: COMPONENTS_TEAM },
      { name: "Shop", items: COMPONENTS_SHOP },
      { name: "Social", items: COMPONENTS_SOCIAL },
      { name: "Shared", items: COMPONENTS_SHARED },
      { name: "TV", items: COMPONENTS_TV },
      { name: "Admin", items: COMPONENTS_ADMIN },
    ];

    return (
      <div className="space-y-6">
        <div className="bg-primary/10 rounded-xl p-4 mb-4">
          <p className="text-sm text-primary font-medium">
            📊 Total Components: {allComponentGroups.reduce((sum, g) => sum + g.items.length, 0)}
          </p>
        </div>
        {allComponentGroups.map(group => {
          const filtered = group.items.filter(c => 
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.description.toLowerCase().includes(searchQuery.toLowerCase())
          );
          if (filtered.length === 0) return null;
          return (
            <div key={group.name}>
              <h3 className="text-lg font-bold mb-3 text-primary flex items-center gap-2">
                {group.name}
                <span className="text-xs bg-primary/20 px-2 py-0.5 rounded">{filtered.length}</span>
              </h3>
              <div className="grid gap-3">
                {filtered.map(comp => (
                  <div key={comp.name} className="bg-card/50 rounded-lg p-4 border border-border/30">
                    <h4 className="font-mono font-bold text-foreground">{comp.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{comp.description}</p>
                    <p className="text-xs text-muted-foreground mt-2 font-mono">{comp.path}</p>
                    {comp.props && comp.props.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {comp.props.map((prop: string) => (
                          <span key={prop} className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{prop}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderServices = () => (
    <div className="space-y-4">
      {ALL_SERVICES.map(service => (
        <div key={service.name} className="bg-card/50 rounded-lg p-4 border border-border/30">
          <h4 className="font-mono font-bold text-foreground">{service.name}</h4>
          <p className="text-sm text-muted-foreground">{service.description}</p>
          <div className="mt-3 space-y-2">
            {service.methods.map(m => (
              <div key={m.name} className="pl-3 border-l border-primary/30 text-sm">
                <code className="text-primary">{m.name}</code>
                <span className="text-muted-foreground ml-2">→ {m.returns}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderContexts = () => (
    <div className="space-y-4">
      {ALL_CONTEXTS.map(ctx => (
        <div key={ctx.name} className="bg-card/50 rounded-lg p-4 border border-border/30">
          <h4 className="font-mono font-bold text-foreground">{ctx.name}</h4>
          <p className="text-sm text-muted-foreground">{ctx.description}</p>
          <p className="text-xs text-primary mt-1">Hook: {ctx.hook}</p>
        </div>
      ))}
    </div>
  );

  const renderConfig = () => (
    <div className="space-y-4">
      {ALL_CONFIGS.map(cfg => (
        <div key={cfg.name} className="bg-card/50 rounded-lg p-4 border border-border/30">
          <h4 className="font-mono font-bold text-foreground">{cfg.name}</h4>
          <p className="text-sm text-muted-foreground">{cfg.description}</p>
          <p className="text-xs text-muted-foreground mt-1">{cfg.filePath}</p>
        </div>
      ))}
    </div>
  );

  const renderUtilities = () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          🔧 Utility Functions
          <span className="text-sm bg-primary/20 px-2 py-0.5 rounded">{UTILITIES.length}</span>
        </h2>
        <div className="grid gap-3">
          {UTILITIES.filter(u => 
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.description.toLowerCase().includes(searchQuery.toLowerCase())
          ).map(util => (
            <div key={util.name} className="bg-card/50 rounded-lg p-4 border border-border/30">
              <h4 className="font-mono font-bold text-foreground">{util.name}</h4>
              <p className="text-sm text-muted-foreground">{util.description}</p>
              <pre className="mt-2 text-xs bg-background/60 p-2 rounded overflow-x-auto">{util.usage}</pre>
              <p className="text-xs text-muted-foreground mt-2">{util.path}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          📌 Constants
          <span className="text-sm bg-primary/20 px-2 py-0.5 rounded">{CONSTANTS.length}</span>
        </h2>
        <div className="grid gap-3">
          {CONSTANTS.map(constant => (
            <div key={constant.name} className="bg-card/50 rounded-lg p-4 border border-border/30">
              <h4 className="font-mono font-bold text-foreground">{constant.name}</h4>
              <p className="text-sm text-muted-foreground">{constant.description}</p>
              <pre className="mt-2 text-xs bg-background/60 p-2 rounded overflow-x-auto">
                {JSON.stringify(constant.values, null, 2)}
              </pre>
              <p className="text-xs text-muted-foreground mt-2">{constant.path}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          📝 Type Definitions
          <span className="text-sm bg-primary/20 px-2 py-0.5 rounded">{TYPE_DEFINITIONS.length}</span>
        </h2>
        <div className="grid gap-3">
          {TYPE_DEFINITIONS.map(typeDef => (
            <div key={typeDef.name} className="bg-card/50 rounded-lg p-4 border border-border/30">
              <h4 className="font-mono font-bold text-foreground">{typeDef.name}</h4>
              <p className="text-sm text-muted-foreground">{typeDef.description}</p>
              <div className="mt-2 space-y-1">
                {typeDef.properties.map((prop: string) => (
                  <div key={prop} className="text-xs font-mono text-primary bg-background/60 px-2 py-1 rounded">
                    {prop}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">{typeDef.path}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderApiFlows = () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold mb-4">🔄 API Flow Diagrams</h2>
        <div className="space-y-6">
          {API_FLOWS.filter(flow => 
            flow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            flow.description.toLowerCase().includes(searchQuery.toLowerCase())
          ).map(flow => (
            <div key={flow.name} className="bg-card/50 rounded-xl p-6 border border-border/30">
              <h3 className="text-lg font-bold text-foreground mb-2">{flow.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{flow.description}</p>
              <div className="bg-background/80 rounded-lg p-4 mb-4 overflow-x-auto">
                <pre className="text-xs font-mono text-muted-foreground whitespace-pre">{flow.diagram}</pre>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Steps:</h4>
                {flow.steps.map((step, i) => (
                  <div key={i} className="text-sm text-muted-foreground pl-4 border-l-2 border-primary/30">
                    {step}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">🔗 Database Relationships</h2>
        <div className="bg-card/50 rounded-xl p-6 border border-border/30">
          <p className="text-sm text-muted-foreground mb-4">{DATABASE_RELATIONSHIPS.description}</p>
          <div className="bg-background/80 rounded-lg p-4 mb-4 overflow-x-auto">
            <pre className="text-xs font-mono text-muted-foreground whitespace-pre">{DATABASE_RELATIONSHIPS.diagram}</pre>
          </div>
          <div className="space-y-3 mt-4">
            {DATABASE_RELATIONSHIPS.relationships.map((rel, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="font-mono text-primary">{rel.from}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-mono text-primary">{rel.to}</span>
                <span className="text-xs bg-muted px-2 py-0.5 rounded">{rel.type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">🔒 RLS Policy Patterns</h2>
        <div className="space-y-4">
          {RLS_POLICY_PATTERNS.map((pattern, i) => (
            <div key={i} className="bg-card/50 rounded-xl p-6 border border-border/30">
              <h3 className="font-bold text-foreground mb-2">{pattern.pattern}</h3>
              <p className="text-sm text-muted-foreground mb-3">{pattern.description}</p>
              <pre className="bg-background/80 rounded-lg p-3 text-xs font-mono overflow-x-auto">{pattern.example}</pre>
              <div className="mt-3 flex flex-wrap gap-1">
                {pattern.tables.map(table => (
                  <span key={table} className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">{table}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "architecture": return renderArchitecture();
      case "tables": return renderTables();
      case "functions": return renderFunctions();
      case "hooks": return renderHooks();
      case "components": return renderComponents();
      case "services": return renderServices();
      case "contexts": return renderContexts();
      case "config": return renderConfig();
      case "utilities": return renderUtilities();
      case "apiFlows": return renderApiFlows();
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-64 border-r border-border/30 bg-card/30 p-4 flex flex-col">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-xl font-bold mb-4">📚 Documentation</h1>
        <nav className="space-y-1">
          {SECTIONS.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeSection === section.id 
                  ? "bg-primary/20 text-primary" 
                  : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <section.icon className="w-4 h-4" />
              {section.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border/30">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <ScrollArea className="flex-1 p-6">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl"
          >
            {renderContent()}
          </motion.div>
        </ScrollArea>
      </div>
    </div>
  );
}
