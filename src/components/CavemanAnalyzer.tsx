import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Upload, Sparkles, Loader2, Image as ImageIcon, Download } from 'lucide-react';

interface AnalysisResponse {
  status: string;
  video_url?: string;
  message?: string;
  processing_status?: string;
  created_at?: string;
  request_id?: string;
}

const CavemanAnalyzer = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<'analyzing' | 'generating_image' | 'generating_video'>('analyzing');
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);

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

  const getProcessingMessage = () => {
    if (!processingStartTime) return "Preparing...";
    
    const elapsed = Math.floor((Date.now() - processingStartTime) / 1000);
    
    if (elapsed < 15) {
      return "🔍 Analyzing your photo...";
    } else if (elapsed < 90) {
      return "🎨 Creating your caveman image...";
    } else {
      return "🎬 Generating your transformation video...";
    }
  };

  const getEstimatedTimeRemaining = () => {
    if (!processingStartTime) return "2-4 minutes";
    
    const elapsed = Math.floor((Date.now() - processingStartTime) / 1000);
    
    if (elapsed < 15) {
      return "2-4 minutes remaining";
    } else if (elapsed < 90) {
      return "1-3 minutes remaining";
    } else if (elapsed < 180) {
      return "1-2 minutes remaining";
    } else {
      return "Almost done...";
    }
  };

  const startPollingForVideo = useCallback(() => {
    const pollInterval = setInterval(async () => {
      try {
        const payload = {
          check_status: true,
          request_id: requestId,
          timestamp: new Date().toISOString()
        };

        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const result: AnalysisResponse = await response.json();
          
          if (result.status === "success" && result.video_url && result.video_url.trim() && result.video_url.startsWith('http')) {
            setVideoUrl(result.video_url);
            setIsProcessing(false);
            clearInterval(pollInterval);
            toast({
              title: "Cave Magic Complete!",
              description: "Your caveman transformation is ready!",
            });
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000); // Poll every 5 seconds

    // Stop polling after 6 minutes (safety buffer)
    setTimeout(() => {
      clearInterval(pollInterval);
      if (isProcessing) {
        setIsProcessing(false);
        toast({
          title: "Cave Magic Taking Long!",
          description: "Video still processing. Try refreshing or check back later!",
          variant: "destructive"
        });
      }
    }, 360000); // 6 minutes
  }, [requestId, isProcessing]);

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

      if (result.status === "success" && result.video_url && result.video_url.trim() && result.video_url.startsWith('http')) {
        setVideoUrl(result.video_url);
        setIsProcessing(false);
        toast({
          title: "Cave Magic Complete!",
          description: result.message || "Your caveman transformation is ready!",
        });
      } else if (result.status === "success") {
        setIsProcessing(true);
        setProcessingStartTime(Date.now());
        if (result.request_id) {
          setRequestId(result.request_id);
        }
        toast({
          title: "Cave Magic Working!",
          description: "This process typically takes 2-4 minutes. Please keep this tab open!",
        });
        // Start polling for video
        startPollingForVideo();
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

          {/* Processing Status */}
          {isProcessing && (
            <Card className="bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center space-x-3 mb-3">
                  <Loader2 className="h-6 w-6 animate-spin text-yellow-600" />
                  <p className="text-yellow-800 dark:text-yellow-200 font-bold text-lg">
                    {getProcessingMessage()}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                    {getEstimatedTimeRemaining()}
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    Please keep this tab open while we work our magic! 🪄
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Video Display */}
          {videoUrl && (
            <Card className="bg-accent/20">
              <CardHeader>
                <CardTitle className="text-center">🎬 Your Caveman Transformation! 🎬</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  className="w-full max-w-md mx-auto rounded-lg shadow-lg"
                  style={{ maxWidth: '500px' }}
                  preload="metadata"
                >
                  Your browser does not support video playback.
                </video>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = videoUrl;
                    link.download = 'caveman-transformation.mp4';
                    link.target = '_blank';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Video
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Cave spirits have transformed you into a mighty caveman warrior!
                </p>
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