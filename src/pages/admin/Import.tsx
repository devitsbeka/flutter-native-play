import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link2, FileJson, FileSpreadsheet, Sparkles, FileText } from 'lucide-react';
import { ParserTool } from './import/ParserTool';
import { JsonImport } from './import/JsonImport';
import { CsvImport } from './import/CsvImport';
import { AiGenerator } from './import/AiGenerator';
import { TextImport } from './import/TextImport';

const importTools = [
  { id: 'parser', label: 'URL Parser', icon: Link2, description: 'AI-powered web scraper' },
  { id: 'json', label: 'JSON', icon: FileJson, description: 'Import from JSON' },
  { id: 'csv', label: 'CSV', icon: FileSpreadsheet, description: 'Import from CSV' },
  { id: 'generate', label: 'AI Generator', icon: Sparkles, description: 'Generate with AI' },
  { id: 'text', label: 'ტექსტი', icon: FileText, description: 'Parse plain text' },
];

export default function Import() {
  const [activeTab, setActiveTab] = useState('parser');

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">იმპორტი</h1>
          <p className="text-muted-foreground mt-1">
            კითხვების მასობრივი იმპორტი სხვადასხვა წყაროებიდან
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-auto p-1">
            {importTools.map((tool) => (
              <TabsTrigger
                key={tool.id}
                value={tool.id}
                className="flex flex-col items-center gap-1 py-3 px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <tool.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{tool.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-6">
            <TabsContent value="parser" className="mt-0">
              <ParserTool />
            </TabsContent>

            <TabsContent value="json" className="mt-0">
              <JsonImport />
            </TabsContent>

            <TabsContent value="csv" className="mt-0">
              <CsvImport />
            </TabsContent>

            <TabsContent value="generate" className="mt-0">
              <AiGenerator />
            </TabsContent>

            <TabsContent value="text" className="mt-0">
              <TextImport />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </ScrollArea>
  );
}
