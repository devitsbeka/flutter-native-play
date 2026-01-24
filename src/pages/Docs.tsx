import { useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, Database, Code, Layers, Settings, Cpu, GitBranch, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { ARCHITECTURE_SECTIONS } from "@/data/documentation/architecture";
import { ALL_TABLES, TABLE_CATEGORIES_NAV } from "@/data/documentation/tables";
import { ALL_EDGE_FUNCTIONS, EDGE_FUNCTION_CATEGORIES } from "@/data/documentation/edgeFunctions";
import { ALL_HOOKS, HOOK_CATEGORIES } from "@/data/documentation/hooks";
import { ALL_COMPONENTS, COMPONENT_CATEGORIES } from "@/data/documentation/components";
import { ALL_SERVICES, SERVICE_CATEGORIES } from "@/data/documentation/services";
import { ALL_CONTEXTS, CONTEXT_CATEGORIES } from "@/data/documentation/contexts";
import { ALL_CONFIGS, CONFIG_CATEGORIES } from "@/data/documentation/config";

type DocSection = "architecture" | "tables" | "functions" | "hooks" | "components" | "services" | "contexts" | "config";

const SECTIONS = [
  { id: "architecture" as const, name: "Architecture", nameKa: "არქიტექტურა", icon: GitBranch },
  { id: "tables" as const, name: "Database Tables", nameKa: "მონაცემთა ბაზის ცხრილები", icon: Database },
  { id: "functions" as const, name: "Edge Functions", nameKa: "Edge ფუნქციები", icon: Cpu },
  { id: "hooks" as const, name: "Hooks", nameKa: "Hooks", icon: Code },
  { id: "components" as const, name: "Components", nameKa: "კომპონენტები", icon: Layers },
  { id: "services" as const, name: "Services", nameKa: "სერვისები", icon: Settings },
  { id: "contexts" as const, name: "Contexts", nameKa: "კონტექსტები", icon: GitBranch },
  { id: "config" as const, name: "Configuration", nameKa: "კონფიგურაცია", icon: Settings },
];

export default function Docs() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<DocSection>("architecture");
  const [searchQuery, setSearchQuery] = useState("");

  const renderArchitecture = () => (
    <div className="space-y-8">
      {ARCHITECTURE_SECTIONS.map((section) => (
        <div key={section.id} className="bg-card/50 rounded-xl p-6 border border-border/30">
          <h2 className="text-xl font-bold mb-2">{language === "ka" ? section.titleKa : section.title}</h2>
          <pre className="text-sm text-muted-foreground whitespace-pre-wrap mb-4">
            {language === "ka" ? section.descriptionKa : section.description}
          </pre>
          {section.subsections?.map((sub, i) => (
            <div key={i} className="mt-4 pl-4 border-l-2 border-primary/30">
              <h3 className="font-semibold">{language === "ka" ? sub.titleKa : sub.title}</h3>
              <pre className="text-sm text-muted-foreground whitespace-pre-wrap">{language === "ka" ? sub.contentKa : sub.content}</pre>
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
              <h3 className="text-lg font-bold mb-2 text-primary">{language === "ka" ? cat.nameKa : cat.name}</h3>
              {tables.map(table => (
                <div key={table.name} className="bg-card/50 rounded-lg p-4 mb-3 border border-border/30">
                  <h4 className="font-mono font-bold text-foreground">{table.name}</h4>
                  <p className="text-sm text-muted-foreground">{language === "ka" ? table.descriptionKa : table.description}</p>
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
              <h3 className="text-lg font-bold mb-2 text-primary">{language === "ka" ? cat.nameKa : cat.name}</h3>
              {funcs.map(func => (
                <div key={func.name} className="bg-card/50 rounded-lg p-4 mb-3 border border-border/30">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-primary/20 rounded text-xs font-mono">{func.method}</span>
                    <h4 className="font-mono font-bold">{func.name}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{language === "ka" ? func.descriptionKa : func.description}</p>
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
              <h3 className="text-lg font-bold mb-2 text-primary">{language === "ka" ? cat.nameKa : cat.name}</h3>
              {hooks.map(hook => (
                <div key={hook.name} className="bg-card/50 rounded-lg p-4 mb-3 border border-border/30">
                  <h4 className="font-mono font-bold text-foreground">{hook.name}</h4>
                  <p className="text-sm text-muted-foreground">{language === "ka" ? hook.descriptionKa : hook.description}</p>
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
    const filtered = ALL_COMPONENTS.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return (
      <div className="space-y-4">
        {COMPONENT_CATEGORIES.map(cat => {
          const comps = filtered.filter(c => c.category === cat.name);
          if (comps.length === 0) return null;
          return (
            <div key={cat.id}>
              <h3 className="text-lg font-bold mb-2 text-primary">{language === "ka" ? cat.nameKa : cat.name}</h3>
              {comps.map(comp => (
                <div key={comp.name} className="bg-card/50 rounded-lg p-4 mb-3 border border-border/30">
                  <h4 className="font-mono font-bold text-foreground">{comp.name}</h4>
                  <p className="text-sm text-muted-foreground">{language === "ka" ? comp.descriptionKa : comp.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{comp.filePath}</p>
                </div>
              ))}
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
          <p className="text-sm text-muted-foreground">{language === "ka" ? service.descriptionKa : service.description}</p>
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
          <p className="text-sm text-muted-foreground">{language === "ka" ? ctx.descriptionKa : ctx.description}</p>
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
          <p className="text-sm text-muted-foreground">{language === "ka" ? cfg.descriptionKa : cfg.description}</p>
          <p className="text-xs text-muted-foreground mt-1">{cfg.filePath}</p>
        </div>
      ))}
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
              {language === "ka" ? section.nameKa : section.name}
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
