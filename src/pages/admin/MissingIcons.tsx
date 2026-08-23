import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Copy, Check, Search, Loader2 } from 'lucide-react';
import { toast } from "@/lib/toast";

interface IconMeta {
  title: string;
  file_name: string;
  slug: string;
  category: string;
  tags: string[];
}

const STORAGE_BASE_URL = 'https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icons/';
const BATCH_SIZE = 50;

export default function MissingIcons() {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [missingIcons, setMissingIcons] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);

  const checkIconExists = async (fileName: string): Promise<boolean> => {
    try {
      const response = await fetch(`${STORAGE_BASE_URL}${fileName}`, {
        method: 'GET',
        cache: 'no-store',
      });
      // Check if it's actually an image by looking at content-type
      const contentType = response.headers.get('content-type');
      if (!response.ok || !contentType?.startsWith('image/')) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  const scanIcons = useCallback(async (fullScan: boolean) => {
    setIsScanning(true);
    setMissingIcons([]);
    setProgress(0);
    setScanComplete(false);

    try {
      // Load icon metadata from JSON
      const response = await fetch('/data/icon-library-meta.json');
      if (!response.ok) {
        throw new Error('Failed to load icon metadata');
      }
      
      const data = await response.json();
      let icons: IconMeta[] = data.items || [];
      
      // For quick scan, sample random icons
      if (!fullScan) {
        const shuffled = [...icons].sort(() => Math.random() - 0.5);
        icons = shuffled.slice(0, 100);
      }
      
      setTotal(icons.length);
      const missing: string[] = [];
      
      // Process in batches
      for (let i = 0; i < icons.length; i += BATCH_SIZE) {
        const batch = icons.slice(i, i + BATCH_SIZE);
        
        const results = await Promise.all(
          batch.map(async (icon) => {
            const exists = await checkIconExists(icon.file_name);
            return { fileName: icon.file_name, exists };
          })
        );
        
        results.forEach(({ fileName, exists }) => {
          if (!exists) {
            missing.push(fileName);
          }
        });
        
        setProgress(Math.min(i + BATCH_SIZE, icons.length));
        setMissingIcons([...missing]);
      }
      
      setScanComplete(true);
      toast.success(`Scan complete. Found ${missing.length} missing icons.`);
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Failed to scan icons');
    } finally {
      setIsScanning(false);
    }
  }, []);

  const copyToClipboard = async () => {
    const text = missingIcons.join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const progressPercent = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Missing Icons Scanner</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Find icons referenced in metadata but missing from storage
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => scanIcons(false)}
              disabled={isScanning}
            >
              {isScanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Quick Scan (100)
            </Button>
            <Button 
              onClick={() => scanIcons(true)}
              disabled={isScanning}
            >
              {isScanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Full Scan
            </Button>
          </div>
        </div>

        {(isScanning || scanComplete) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {isScanning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    Scan Complete
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{progress} / {total} ({progressPercent}%)</span>
                </div>
                <Progress value={progressPercent} />
              </div>

              {missingIcons.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-500">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">{missingIcons.length} missing icons</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={copyToClipboard}
                    >
                      {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                      {copied ? 'Copied!' : 'Copy List'}
                    </Button>
                  </div>
                  
                  <div className="bg-muted rounded-lg p-4 max-h-96 overflow-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                      {missingIcons.join('\n')}
                    </pre>
                  </div>
                </div>
              )}

              {scanComplete && missingIcons.length === 0 && (
                <div className="text-center py-4 text-green-500">
                  <Check className="h-8 w-8 mx-auto mb-2" />
                  <p>All icons are present in storage!</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!isScanning && !scanComplete && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Click "Quick Scan" to check 100 random icons</p>
              <p className="text-sm mt-1">or "Full Scan" to check all icons in the library</p>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
