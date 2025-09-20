import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Upload, Sparkles, Loader2, Image as ImageIcon } from 'lucide-react';

interface AnalysisResponse {
  success: boolean;
  message?: string;
  videoUrl?: string;
  analysisId?: string;
}

const CavemanAnalyzer = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const WEBHOOK_URL = "https://anss1111.app.n8n.cloud/webhook-test/image-analysis";

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Ooga Booga! Wrong File!",
        description: "Caveman only understand picture files! Upload image please.",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "Picture Too Big!",
        description: "Caveman brain small! Make picture smaller than 10MB.",
        variant: "destructive"
      });
      return;
    }

    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    toast({
      title: "Picture Ready!",
      description: "Caveman see good picture! Now click magic button!",
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove the data:image/...;base64, prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const analyzeImage = async () => {
    if (!selectedImage) {
      toast({
        title: "No Picture!",
        description: "Caveman need picture first! Upload image please.",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      // Convert image to base64
      const base64Image = await convertToBase64(selectedImage);
      
      const payload = {
        image: base64Image,
        filename: selectedImage.name,
        mimeType: selectedImage.type,
        timestamp: new Date().toISOString()
      };

      toast({
        title: "Caveman Magic Starting!",
        description: "Sending picture to cave spirits... This take time!",
      });

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: AnalysisResponse = await response.json();

      if (result.success) {
        toast({
          title: "Cave Magic Work!",
          description: result.message || "Caveman spirits processing your picture! Video coming soon!",
        });
      } else {
        toast({
          title: "Cave Spirits Angry!",
          description: result.message || "Something went wrong with cave magic!",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Cave Magic Failed!",
        description: "Cave spirits not responding! Backend still being built...",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl stone-texture">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl md:text-5xl mb-4">
            🔥 CAVEMAN CANVAS CRAFT 🔥
          </CardTitle>
          <CardDescription className="text-lg">
            Upload your picture and discover your inner caveman! 
            The cave spirits will transform you into ancient warrior!
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Upload Area */}
          <div
            className={`upload-area rounded-lg p-8 text-center cursor-pointer transition-all duration-300 ${
              isDragOver ? 'dragover' : ''
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
            />
            
            {imagePreview ? (
              <div className="space-y-4">
                <img
                  src={imagePreview}
                  alt="Selected"
                  className="max-w-full max-h-64 mx-auto rounded-lg shadow-lg"
                />
                <p className="text-sm text-muted-foreground">
                  Picture ready! Click magic button below!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 rounded-full bg-primary/10">
                    <Upload className="h-12 w-12 text-primary" />
                  </div>
                </div>
                <div>
                  <p className="text-xl font-semibold mb-2">
                    Drop Picture Here or Click!
                  </p>
                  <p className="text-muted-foreground">
                    Caveman need good picture to make magic! 
                    <br />
                    JPG, PNG, WEBP welcome (Max 10MB)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Analysis Button */}
          <Button
            onClick={analyzeImage}
            disabled={!selectedImage || isAnalyzing}
            className="w-full h-14 text-lg font-bold fire-glow"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                Cave Spirits Working...
              </>
            ) : (
              <>
                <Sparkles className="mr-3 h-6 w-6" />
                How Will I Be As A Caveman? 🦴
              </>
            )}
          </Button>

          {/* Info Section */}
          {selectedImage && (
            <Card className="bg-accent/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <ImageIcon className="h-5 w-5 text-accent" />
                  <div className="text-sm">
                    <p className="font-medium">{selectedImage.name}</p>
                    <p className="text-muted-foreground">
                      Size: {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warning for Backend */}
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">
                🚧 <strong>Cave Under Construction!</strong> 🚧
                <br />
                Backend spirits still learning magic. Video creation may not work yet!
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default CavemanAnalyzer;