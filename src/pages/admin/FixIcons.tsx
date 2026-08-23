import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { FileArchive, Loader2, CheckCircle, AlertCircle, Wrench, RefreshCw } from "lucide-react";
import { refreshDbIconsCache } from "@/hooks/useIconLibrary";

interface FixStatus {
  phase: "idle" | "uploading" | "extracting" | "done" | "error";
  message: string;
  progress: number;
  details?: string;
}

export default function FixIcons() {
  const [status, setStatus] = useState<FixStatus>({
    phase: "idle",
    message: "აირჩიეთ ZIP ფაილი გატეხილი აიკონების გამოსასწორებლად",
    progress: 0,
  });
  const [brokenCount, setBrokenCount] = useState<number | null>(null);
  const [selectedZipFile, setSelectedZipFile] = useState<File | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Check broken icons count from verification results table
  const checkBrokenCount = async () => {
    setIsLoading(true);
    try {
      const { count, error } = await supabase
        .from("icon_verification_results")
        .select("*", { count: "exact", head: true })
        .eq('is_valid', false);
      
      if (error) throw error;
      setBrokenCount(count ?? 0);
    } catch (err) {
      console.error("Error checking broken count:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkBrokenCount();
  }, []);

  // Handle ZIP file selection
  const handleZipFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.zip')) {
      setSelectedZipFile(file);
      setStatus({
        phase: "idle",
        message: `მზადაა: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`,
        progress: 0,
      });
    } else if (file) {
      toast.error("გთხოვთ აირჩიოთ ZIP ფაილი");
    }
  };

  // Fix missing icons from uploaded ZIP
  const fixMissingIconsFromZip = async () => {
    if (!selectedZipFile) {
      toast.error("გთხოვთ ჯერ აირჩიოთ ZIP ფაილი");
      return;
    }

    setIsFixing(true);
    setStatus({
      phase: "uploading",
      message: "ZIP ფაილი იტვირთება...",
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
        throw new Error(`ZIP ატვირთვა ვერ მოხერხდა: ${uploadError.message}`);
      }

      // Get the public URL for the uploaded ZIP
      const { data: urlData } = supabase.storage
        .from('icons')
        .getPublicUrl(zipFileName);

      const zipUrl = urlData.publicUrl;
      console.log("ZIP uploaded to:", zipUrl);

      setStatus({
        phase: "extracting",
        message: "ექსტრაქცია იწყება...",
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
          phase: "extracting",
          message: `ბატჩი ${Math.floor(batchStart / batchSize) + 1} მუშავდება...`,
          progress: progressPercent,
          details: `გამოსწორებული: ${totalUploaded} | შესაბამისი: ${totalMatched} | გამოტოვებული: ${totalSkipped}`,
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
        message: `წარმატებით გამოსწორდა ${totalUploaded} აიკონი!`,
        progress: 100,
        details: `სულ ფაილები: ${totalFiles} | შესაბამისი: ${totalMatched} | გამოტოვებული: ${totalSkipped}`,
      });

      toast.success(`${totalUploaded} გატეხილი აიკონი გამოსწორდა!`);
      
      // Refresh counts
      await checkBrokenCount();
      refreshDbIconsCache();
      window.dispatchEvent(new CustomEvent('icon-library-refresh'));
      
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
        message: "აიკონების გამოსწორება ვერ მოხერხდა",
        progress: 0,
        details: error.message,
      });
      toast.error("შეცდომა: " + error.message);
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">გატეხილი აიკონების გამოსწორება</h1>
            <p className="text-muted-foreground text-sm mt-1">
              ატვირთეთ ZIP ფაილი გამოსატოვებელი აიკონებით
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkBrokenCount}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            განახლება
          </Button>
        </div>

        {/* Stats Card */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : brokenCount === 0 ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
              სტატუსი
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">იტვირთება...</p>
            ) : brokenCount === 0 ? (
              <p className="text-green-600 font-medium">ყველა აიკონი მუშაობს! 🎉</p>
            ) : (
              <p className="text-destructive font-medium">
                {brokenCount?.toLocaleString()} გატეხილი აიკონი
              </p>
            )}
          </CardContent>
        </Card>

        {/* Fix Icons Card */}
        {brokenCount !== null && brokenCount > 0 && (
          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
                ZIP-დან აიკონების ექსტრაქცია
              </CardTitle>
              <CardDescription>
                ატვირთეთ ZIP ფაილი რომელიც შეიცავს PNG აიკონებს. ფაილები ავტომატურად დამატდება 
                {brokenCount.toLocaleString()} გატეხილ აიკონთან.
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
              </div>
              
              {selectedZipFile && (
                <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <strong>{selectedZipFile.name}</strong> — {(selectedZipFile.size / 1024 / 1024).toFixed(1)} MB
                </div>
              )}

              <Button
                onClick={fixMissingIconsFromZip}
                disabled={!selectedZipFile || isFixing}
                className="w-full"
                size="lg"
              >
                {isFixing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileArchive className="w-4 h-4 mr-2" />
                )}
                {isFixing ? "მუშავდება..." : `ექსტრაქცია და ${brokenCount.toLocaleString()} აიკონის გამოსწორება`}
              </Button>

              {status.phase !== "idle" && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    {status.phase === "done" && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {status.phase === "error" && <AlertCircle className="w-4 h-4 text-destructive" />}
                    {(status.phase === "uploading" || status.phase === "extracting") && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    <span className="text-sm font-medium">{status.message}</span>
                  </div>
                  <Progress value={status.progress} className="h-2" />
                  {status.details && (
                    <p className="text-xs text-muted-foreground">{status.details}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Success state */}
        {brokenCount === 0 && !isLoading && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium text-green-600">ყველა აიკონი მუშაობს!</p>
              <p className="text-sm text-muted-foreground mt-1">
                გატეხილი აიკონები არ მოიძებნა
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
