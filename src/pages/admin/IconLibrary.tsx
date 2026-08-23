import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { Upload, Database, CheckCircle, AlertCircle, Loader2, RefreshCw, Download, Cloud, FileArchive, Wrench } from "lucide-react";
import { refreshDbIconsCache } from "@/hooks/useIconLibrary";
import { Input } from "@/components/ui/input";

interface ImportStatus {
  phase: "idle" | "extracting" | "importing" | "fixing" | "done" | "error";
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
  const [brokenCount, setBrokenCount] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedZipFile, setSelectedZipFile] = useState<File | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Check how many icons are already imported
  const checkIconCount = async () => {
    const { count, error } = await supabase
      .from("icon_library")
      .select("*", { count: "exact", head: true });
    
    if (!error && count !== null) {
      setIconCount(count);
    }

    // Also check broken icons count
    const { count: broken } = await supabase
      .from("icon_library")
      .select("*", { count: "exact", head: true })
      .or('icon_url.is.null,icon_url.eq.');
    
    if (broken !== null) {
      setBrokenCount(broken);
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

  // Export icons to JSON file for local download
  const handleExportJson = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-icon-library');
      
      if (error) throw error;
      
      // Download as file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'icon-library-meta.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${data.total_count} icons to JSON file`);
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error("Failed to export icons: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Sync icons to storage for frontend use
  const handleSyncToStorage = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-icon-library');
      
      if (error) throw error;
      
      toast.success(`Synced ${data.total_count} icons to storage`);
      refreshIconLibrary(); // Refresh frontend cache
    } catch (error: any) {
      console.error("Sync error:", error);
      toast.error("Failed to sync icons: " + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

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

  // Handle ZIP file selection
  const handleZipFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.zip')) {
      setSelectedZipFile(file);
    } else if (file) {
      toast.error("Please select a ZIP file");
    }
  };

  // Fix missing icons from uploaded ZIP
  const fixMissingIconsFromZip = async () => {
    if (!selectedZipFile) {
      toast.error("Please select a ZIP file first");
      return;
    }

    setIsFixing(true);
    setStatus({
      phase: "fixing",
      message: "Uploading ZIP file...",
      progress: 5,
    });

    try {
      // First, upload the ZIP to storage
      const zipFileName = `missing-icons-${Date.now()}.zip`;
      const { error: uploadError } = await supabase.storage
        .from('icons')
        .upload(zipFileName, selectedZipFile, {
          contentType: 'application/zip',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Failed to upload ZIP: ${uploadError.message}`);
      }

      // Get the public URL for the uploaded ZIP
      const { data: urlData } = supabase.storage
        .from('icons')
        .getPublicUrl(zipFileName);

      const zipUrl = urlData.publicUrl;
      console.log("ZIP uploaded to:", zipUrl);

      setStatus({
        phase: "fixing",
        message: "Starting extraction...",
        progress: 10,
      });

      // Process in batches
      let batchStart = 0;
      const batchSize = 50;
      let hasMore = true;
      let totalUploaded = 0;
      let totalMatched = 0;
      let totalSkipped = 0;
      let totalFiles = 0;

      while (hasMore) {
        const progressPercent = totalFiles > 0 
          ? Math.min(95, 10 + (batchStart / totalFiles) * 85)
          : 15;

        setStatus({
          phase: "fixing",
          message: `Processing batch ${Math.floor(batchStart / batchSize) + 1}...`,
          progress: progressPercent,
          details: `Fixed: ${totalUploaded} | Matched: ${totalMatched} | Skipped: ${totalSkipped}`,
        });

        const { data: result, error } = await supabase.functions.invoke("extract-missing-icons", {
          body: { zipUrl, batchStart, batchSize },
        });

        if (error) {
          throw error;
        }

        totalUploaded += result.uploadedCount || 0;
        totalMatched += result.matchedCount || 0;
        totalSkipped += result.skippedCount || 0;
        totalFiles = result.totalFiles || totalFiles;
        hasMore = result.hasMore || false;
        batchStart = result.nextBatchStart || 0;

        // Log some fixed icons
        if (result.fixedIcons && result.fixedIcons.length > 0) {
          console.log("Fixed icons in this batch:", result.fixedIcons.slice(0, 5));
        }

        // Small delay between batches
        await new Promise(r => setTimeout(r, 300));
      }

      setStatus({
        phase: "done",
        message: `Successfully fixed ${totalUploaded} icons!`,
        progress: 100,
        details: `Total files: ${totalFiles} | Matched: ${totalMatched} | Skipped: ${totalSkipped}`,
      });

      toast.success(`Fixed ${totalUploaded} missing icons from ZIP!`);
      
      // Refresh counts
      await checkIconCount();
      refreshIconLibrary();
      
      // Clear the file selection
      setSelectedZipFile(null);
      if (zipInputRef.current) {
        zipInputRef.current.value = '';
      }

      // Clean up the uploaded ZIP
      await supabase.storage.from('icons').remove([zipFileName]);

    } catch (error: any) {
      console.error("Fix missing icons error:", error);
      setStatus({
        phase: "error",
        message: "Failed to fix missing icons",
        progress: 0,
        details: error.message,
      });
      toast.error("Failed to fix missing icons: " + error.message);
    } finally {
      setIsFixing(false);
    }
  };

  // Check icon count on mount
  useEffect(() => {
    checkIconCount();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-2xl overflow-y-auto h-full pb-20">
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
            {status.phase === "fixing" && <Loader2 className="w-5 h-5 animate-spin" />}
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
          <div className="mt-4 space-y-1 text-sm">
            {iconCount !== null && (
              <p><strong>Icons in database:</strong> {iconCount.toLocaleString()}</p>
            )}
            {brokenCount !== null && brokenCount > 0 && (
              <p className="text-destructive"><strong>Broken icons:</strong> {brokenCount.toLocaleString()}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Cards */}
      <div className="grid gap-4">
        {/* Fix Missing Icons from ZIP - Primary action when there are broken icons */}
        {brokenCount !== null && brokenCount > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="w-5 h-5 text-destructive" />
                Fix Missing Icons from ZIP
              </CardTitle>
              <CardDescription>
                Upload a ZIP containing replacement icons. Files will be matched to the {brokenCount.toLocaleString()} broken icon slugs and uploaded to storage.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Input
                  ref={zipInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleZipFileSelect}
                  className="flex-1"
                  disabled={isFixing}
                />
                {selectedZipFile && (
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {(selectedZipFile.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                )}
              </div>
              <Button
                onClick={fixMissingIconsFromZip}
                disabled={!selectedZipFile || isFixing}
                variant="destructive"
                className="w-full"
              >
                {isFixing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileArchive className="w-4 h-4 mr-2" />
                )}
                {isFixing ? "Extracting & Fixing..." : `Extract & Fix ${brokenCount.toLocaleString()} Icons`}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Sync to Storage - Primary action */}
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Cloud className="w-5 h-5 text-primary" />
              Sync Icons to Storage
            </CardTitle>
            <CardDescription>
              Sync all {iconCount?.toLocaleString() || ''} icons from the database to storage. The frontend will automatically load from storage for fast icon resolution.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleSyncToStorage}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Cloud className="w-4 h-4 mr-2" />
              )}
              Sync {iconCount?.toLocaleString() || ''} Icons to Storage
            </Button>
          </CardContent>
        </Card>

        {/* Export JSON - Secondary action */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Export Icon Library JSON</CardTitle>
            <CardDescription>
              Download all icons from the database as a JSON file for manual backup or local testing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleExportJson}
              variant="outline"
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download JSON
            </Button>
          </CardContent>
        </Card>

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
              disabled={status.phase === "importing" || status.phase === "extracting" || status.phase === "fixing"}
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
              disabled={status.phase === "importing" || status.phase === "extracting" || status.phase === "fixing"}
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
