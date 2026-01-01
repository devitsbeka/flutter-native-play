import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Database, CheckCircle, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { refreshDbIconsCache } from "@/hooks/useIconLibrary";

interface ImportStatus {
  phase: "idle" | "extracting" | "importing" | "done" | "error";
  message: string;
  progress: number;
  details?: string;
}

// Event to notify other components to refresh icons
export const refreshIconLibrary = () => {
  refreshDbIconsCache(); // Clear the module-level cache
  window.dispatchEvent(new CustomEvent('icon-library-refresh'));
};

export default function IconLibraryAdmin() {
  const [status, setStatus] = useState<ImportStatus>({
    phase: "idle",
    message: "Ready to import icon library",
    progress: 0,
  });
  const [iconCount, setIconCount] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check how many icons are already imported
  const checkIconCount = async () => {
    const { count, error } = await supabase
      .from("icon_library")
      .select("*", { count: "exact", head: true });
    
    if (!error && count !== null) {
      setIconCount(count);
    }
  };

  // Force refresh the icon library cache
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await checkIconCount();
      refreshIconLibrary(); // Dispatch event for other components
      toast.success("Icon library refreshed!");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Import metadata from JSON file
  const importMetadata = async () => {
    setStatus({
      phase: "importing",
      message: "Loading icon metadata...",
      progress: 10,
    });

    try {
      // Fetch the meta.json from public folder
      const response = await fetch("/data/icon-library-meta.json");
      if (!response.ok) {
        throw new Error("Failed to load icon metadata file");
      }
      
      const data = await response.json();
      const items = data.items || [];
      
      setStatus({
        phase: "importing",
        message: `Importing ${items.length} icons to database...`,
        progress: 30,
      });

      // Call edge function to import metadata
      const { data: result, error } = await supabase.functions.invoke("import-icon-metadata", {
        body: { metadata: items, volume: 1 },
      });

      if (error) {
        throw error;
      }

      setStatus({
        phase: "done",
        message: `Successfully imported ${result.insertedCount} icons!`,
        progress: 100,
        details: `Processed: ${result.totalProcessed}, Skipped: ${result.skippedCount}`,
      });

      toast.success(`Imported ${result.insertedCount} icons to the library`);
      checkIconCount();
    } catch (error: any) {
      console.error("Import error:", error);
      setStatus({
        phase: "error",
        message: "Import failed",
        progress: 0,
        details: error.message,
      });
      toast.error("Failed to import icons: " + error.message);
    }
  };

  // Extract icons from ZIP (this takes a long time, so we batch it)
  const extractIcons = async () => {
    setStatus({
      phase: "extracting",
      message: "Starting icon extraction...",
      progress: 5,
    });

    try {
      let batchStart = 0;
      const batchSize = 100;
      let hasMore = true;
      let totalUploaded = 0;
      let totalFiles = 0;

      while (hasMore) {
        setStatus({
          phase: "extracting",
          message: `Extracting icons (batch starting at ${batchStart})...`,
          progress: Math.min(90, 5 + (batchStart / 90) * 85),
          details: `Uploaded ${totalUploaded} files so far`,
        });

        const { data: result, error } = await supabase.functions.invoke("extract-icons", {
          body: { batchStart, batchSize },
        });

        if (error) {
          throw error;
        }

        totalUploaded += result.uploadedCount || 0;
        totalFiles = result.totalFiles || totalFiles;
        hasMore = result.hasMore || false;
        batchStart = result.nextBatchStart || 0;

        // Small delay between batches
        await new Promise(r => setTimeout(r, 500));
      }

      setStatus({
        phase: "done",
        message: `Successfully extracted ${totalUploaded} icons!`,
        progress: 100,
        details: `Total files in ZIP: ${totalFiles}`,
      });

      toast.success(`Extracted ${totalUploaded} icons to storage`);
    } catch (error: any) {
      console.error("Extraction error:", error);
      setStatus({
        phase: "error",
        message: "Extraction failed",
        progress: 0,
        details: error.message,
      });
      toast.error("Failed to extract icons: " + error.message);
    }
  };

  // Check icon count on mount
  useEffect(() => {
    checkIconCount();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Icon Library Admin</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status.phase === "idle" && <Database className="w-5 h-5" />}
            {status.phase === "extracting" && <Loader2 className="w-5 h-5 animate-spin" />}
            {status.phase === "importing" && <Loader2 className="w-5 h-5 animate-spin" />}
            {status.phase === "done" && <CheckCircle className="w-5 h-5 text-green-500" />}
            {status.phase === "error" && <AlertCircle className="w-5 h-5 text-red-500" />}
            Status
          </CardTitle>
          <CardDescription>{status.message}</CardDescription>
        </CardHeader>
        <CardContent>
          {status.phase !== "idle" && (
            <div className="space-y-2">
              <Progress value={status.progress} className="h-2" />
              {status.details && (
                <p className="text-sm text-muted-foreground">{status.details}</p>
              )}
            </div>
          )}
          {iconCount !== null && (
            <p className="mt-4 text-sm">
              <strong>Icons in database:</strong> {iconCount.toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Action Cards */}
      <div className="grid gap-4">
        {/* Import Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 1: Import Metadata</CardTitle>
            <CardDescription>
              Import icon metadata from meta.json into the database. This enables the icon lookup system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={importMetadata}
              disabled={status.phase === "importing" || status.phase === "extracting"}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import 9,000 Icons Metadata
            </Button>
          </CardContent>
        </Card>

        {/* Extract Icons (Optional) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 2: Extract Icon Files (Optional)</CardTitle>
            <CardDescription>
              Extract PNG files from icons.zip to storage. This is needed if you want to use actual icon images instead of external URLs. This process takes a while (9,000 files).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={extractIcons}
              variant="outline"
              disabled={status.phase === "importing" || status.phase === "extracting"}
            >
              <Database className="w-4 h-4 mr-2" />
              Extract Icons to Storage
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
