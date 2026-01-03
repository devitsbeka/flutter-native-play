import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, Play, Loader2, CheckCircle, XCircle, Image, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type GenerationType = 'avatar_static' | 'avatar_animation';

interface TestResult {
  success: boolean;
  inputUrl: string;
  outputUrl?: string;
  error?: string;
  duration: number;
}

export const TestGenerationPanel = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState<GenerationType>('avatar_static');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<TestResult | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'არასწორი ფაილი',
        description: 'გთხოვთ ატვირთოთ სურათი',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const runTestGeneration = async () => {
    if (!uploadedImage) {
      toast({
        title: 'სურათი საჭიროა',
        description: 'გთხოვთ ატვირთოთ სატესტო სურათი',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setProgress(10);
    const startTime = Date.now();

    try {
      if (selectedType === 'avatar_static') {
        setProgress(30);
        
        const { data, error } = await supabase.functions.invoke('generate-avatar', {
          body: { imageUrl: uploadedImage },
        });

        setProgress(90);

        if (error) throw error;

        if (data?.success && data?.avatarUrl) {
          setResult({
            success: true,
            inputUrl: uploadedImage,
            outputUrl: data.avatarUrl,
            duration: Date.now() - startTime,
          });
          toast({
            title: 'გენერაცია წარმატებულია',
            description: `დრო: ${((Date.now() - startTime) / 1000).toFixed(1)}წმ`,
          });
        } else {
          throw new Error(data?.error || 'Unknown error');
        }
      } else if (selectedType === 'avatar_animation') {
        toast({
          title: 'ანიმაცია',
          description: 'ანიმაციის ტესტირებას სჭირდება ჯერ სტატიკური ავატარის გენერაცია',
        });
        setIsGenerating(false);
        return;
      }
    } catch (error) {
      console.error('Test generation error:', error);
      setResult({
        success: false,
        inputUrl: uploadedImage,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      });
      toast({
        title: 'გენერაცია ვერ მოხერხდა',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setProgress(100);
      setTimeout(() => setIsGenerating(false), 500);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Input Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">სატესტო სურათი</CardTitle>
          <CardDescription>
            ატვირთეთ სურათი AI გენერაციის ტესტირებისთვის
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>გენერაციის ტიპი</Label>
            <Select value={selectedType} onValueChange={(v) => setSelectedType(v as GenerationType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="avatar_static">სტატიკური ავატარი</SelectItem>
                <SelectItem value="avatar_animation">ანიმირებული ავატარი</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            {uploadedImage ? (
              <div className="space-y-3">
                <img
                  src={uploadedImage}
                  alt="Uploaded"
                  className="w-32 h-32 object-cover rounded-lg mx-auto"
                />
                <p className="text-sm text-muted-foreground">
                  დააწკაპუნეთ სხვა სურათის ასატვირთად
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                <div>
                  <p className="font-medium">ატვირთეთ სურათი</p>
                  <p className="text-sm text-muted-foreground">
                    PNG, JPG ან WEBP
                  </p>
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={runTestGeneration}
            disabled={!uploadedImage || isGenerating}
            className="w-full gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                მიმდინარეობს...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                ტესტის გაშვება
              </>
            )}
          </Button>

          {isGenerating && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-center text-muted-foreground">
                გენერაცია მიმდინარეობს...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">შედეგი</CardTitle>
          <CardDescription>
            გენერაციის შედეგი გამოჩნდება აქ
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {result.success ? (
                  <Badge className="gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    <CheckCircle className="w-3 h-3" />
                    წარმატებული
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="w-3 h-3" />
                    შეცდომა
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  {(result.duration / 1000).toFixed(1)}წმ
                </span>
              </div>

              {result.success && result.outputUrl ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-center">
                      <img
                        src={result.inputUrl}
                        alt="Input"
                        className="w-24 h-24 object-cover rounded-lg border"
                      />
                      <p className="text-xs text-muted-foreground mt-1">წყარო</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    <div className="text-center">
                      <img
                        src={result.outputUrl}
                        alt="Output"
                        className="w-24 h-24 object-cover rounded-lg border"
                      />
                      <p className="text-xs text-muted-foreground mt-1">შედეგი</p>
                    </div>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={result.outputUrl}
                      alt="Generated Avatar"
                      className="w-full"
                    />
                  </div>
                </div>
              ) : result.error ? (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <p className="text-sm text-destructive">{result.error}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Image className="w-12 h-12 mb-3" />
              <p>შედეგი გამოჩნდება ტესტის შემდეგ</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
