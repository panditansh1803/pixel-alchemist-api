import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Upload, Sparkles, Loader2, Image as ImageIcon, Download, Share2, Camera, Zap } from 'lucide-react';

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
  const [progress, setProgress] = useState(0);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  const WEBHOOK_URL = "https://anss1111.app.n8n.cloud/webhook/image-analysis";

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
    if (!processingStartTime) return "Preparing cave magic...";
    
    const elapsed = Math.floor((Date.now() - processingStartTime) / 1000);
    
    if (elapsed < 15) {
      return "🔍 Cave spirits analyzing your essence...";
    } else if (elapsed < 90) {
      return "🎨 Ancient artists crafting your caveman form...";
    } else {
      return "🎬 Weaving time magic for your transformation...";
    }
  };

  // Calculate progress based on elapsed time
  const getProgress = () => {
    if (!processingStartTime) return 0;
    
    const elapsed = Math.floor((Date.now() - processingStartTime) / 1000);
    const totalEstimatedTime = 240; // 4 minutes
    
    return Math.min((elapsed / totalEstimatedTime) * 100, 95); // Cap at 95% until completion
  };

  // Update progress periodically
  useEffect(() => {
    if (!isProcessing || !processingStartTime) return;

    const interval = setInterval(() => {
      setProgress(getProgress());
    }, 1000);

    return () => clearInterval(interval);
  }, [isProcessing, processingStartTime]);

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
            setProgress(100);
            setShowSuccessAnimation(true);
            clearInterval(pollInterval);
            toast({
              title: "🎉 Epic Transformation Complete! 🎉",
              description: "Behold your mighty caveman form! The ancestors are proud!",
            });
            
            // Hide success animation after 3 seconds
            setTimeout(() => setShowSuccessAnimation(false), 3000);
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

    const makeRequest = async (attempt: number = 1): Promise<AnalysisResponse> => {
      try {
        // Convert image to base64
        const base64Image = await convertToBase64(selectedImage);
        
        const payload = {
          image: base64Image,
          filename: selectedImage.name,
          mimeType: selectedImage.type,
          timestamp: new Date().toISOString(),
          trigger_workflow: true, // Signal to trigger workflow
          attempt: attempt
        };

        if (attempt === 1) {
          toast({
            title: "Caveman Magic Starting!",
            description: "Sending picture to cave spirits... This take time!",
          });
        } else {
          toast({
            title: `Retry Attempt ${attempt}`,
            description: "Waking up sleeping cave spirits...",
          });
        }

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
        return result;

      } catch (error) {
        console.error(`Analysis attempt ${attempt} failed:`, error);
        
        // Retry up to 3 times with exponential backoff
        if (attempt < 3) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s delays
          await new Promise(resolve => setTimeout(resolve, delay));
          return makeRequest(attempt + 1);
        } else {
          throw error;
        }
      }
    };

    try {
      const result = await makeRequest();

      if (result.status === "success" && result.video_url && result.video_url.trim() && result.video_url.startsWith('http')) {
        setVideoUrl(result.video_url);
        setIsProcessing(false);
        setProgress(100);
        setShowSuccessAnimation(true);
        toast({
          title: "🎉 Epic Transformation Complete! 🎉",
          description: result.message || "Behold your mighty caveman form! The ancestors are proud!",
        });
        
        // Hide success animation after 3 seconds
        setTimeout(() => setShowSuccessAnimation(false), 3000);
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
      console.error('Final analysis error:', error);
      toast({
        title: "Cave Magic Failed!",
        description: "All attempts failed. Please try manually executing your n8n workflow first, then retry.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const shareTransformation = async () => {
    if (!videoUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Epic Caveman Transformation!',
          text: 'Check out my amazing caveman transformation created with Cave Magic!',
          url: window.location.href
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied!",
        description: "Share your transformation with friends!",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <main className="w-full max-w-2xl">
        <Card className="stone-texture fade-in">
          <CardHeader className="text-center">
            <h1 className="text-4xl md:text-5xl mb-4 bounce-in">
              🔥 CAVEMAN CANVAS CRAFT 🔥
            </h1>
            <CardDescription className="text-lg">
              Upload your picture and discover your inner caveman! 
              The cave spirits will transform you into an ancient warrior!
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Upload Area */}
            <section 
              className={`upload-area rounded-lg p-8 text-center cursor-pointer transition-all duration-300 ${
                isDragOver ? 'dragover' : ''
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => document.getElementById('file-input')?.click()}
              role="button"
              tabIndex={0}
              aria-label="Upload image area"
            >
              <input
                id="file-input"
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="sr-only"
                aria-describedby="upload-description"
              />
              
              {imagePreview ? (
                <div className="space-y-4">
                  <img
                    src={imagePreview}
                    alt="Selected image preview - ready for caveman transformation"
                    className="max-w-full max-h-64 mx-auto rounded-lg shadow-lg"
                    loading="lazy"
                  />
                  <p className="text-sm text-muted-foreground">
                    🎯 Picture locked and loaded! Click the magic button below!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-primary/10 pulse-glow">
                      <Camera className="h-12 w-12 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold mb-2">
                      📸 Drop Your Photo Here or Click!
                    </h2>
                    <p id="upload-description" className="text-muted-foreground">
                      Feed the cave spirits your finest portrait! 
                      <br />
                      JPG, PNG, WEBP formats accepted (Max 10MB)
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* Analysis Button */}
            <Button
              onClick={analyzeImage}
              disabled={!selectedImage || isAnalyzing}
              className="w-full h-14 text-lg font-bold fire-glow"
              size="lg"
              aria-label="Start caveman transformation"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                  Cave Spirits Working...
                </>
              ) : (
                <>
                  <Zap className="mr-3 h-6 w-6" />
                  ⚡ Transform Me Into A Caveman! 🦴
                </>
              )}
            </Button>

            {/* Image Info Section */}
            {selectedImage && (
              <Card className="bg-accent/20 fade-in">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <ImageIcon className="h-5 w-5 text-accent" />
                    <div className="text-sm">
                      <p className="font-medium">{selectedImage.name}</p>
                      <p className="text-muted-foreground">
                        Size: {(selectedImage.size / 1024 / 1024).toFixed(2)} MB | 
                        Format: {selectedImage.type.split('/')[1].toUpperCase()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Processing Status */}
            {isProcessing && (
              <Card className="bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 fade-in">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center space-x-3 mb-4">
                    <Loader2 className="h-6 w-6 animate-spin text-yellow-600" />
                    <h3 className="text-yellow-800 dark:text-yellow-200 font-bold text-lg">
                      {getProcessingMessage()}
                    </h3>
                  </div>
                  
                  <div className="space-y-4">
                    <ProgressBar progress={progress} className="mb-4" />
                    
                    <div className="space-y-2">
                      <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                        {getEstimatedTimeRemaining()}
                      </p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400">
                        ⚡ Ancient magic takes time! Keep this sacred window open! 🏺
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Video Display */}
            {videoUrl && (
              <Card className={`bg-accent/20 ${showSuccessAnimation ? 'bounce-in' : 'fade-in'}`}>
                <CardHeader>
                  <h2 className="text-center text-2xl">
                    🎬 Behold Your Epic Transformation! 🎬
                  </h2>
                  {showSuccessAnimation && (
                    <p className="text-center text-lg text-accent animate-pulse">
                      ✨ The ancient magic is complete! ✨
                    </p>
                  )}
                </CardHeader>
                <CardContent className="text-center space-y-6">
                  <video
                    src={videoUrl}
                    controls
                    autoPlay
                    className="w-full max-w-md mx-auto rounded-lg shadow-lg"
                    style={{ maxWidth: '500px' }}
                    preload="metadata"
                    aria-label="Your caveman transformation video"
                  >
                    <track kind="captions" src="" label="English" />
                    Your browser does not support video playback.
                  </video>
                  
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = videoUrl;
                        link.download = 'epic-caveman-transformation.mp4';
                        link.target = '_blank';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Masterpiece
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={shareTransformation}
                      className="flex items-center gap-2"
                    >
                      <Share2 className="h-4 w-4" />
                      Share Your Glory
                    </Button>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-2">
                    🏺 The ancestors smile upon your transformation! You are now a legendary cave warrior! 🗿
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Development Notice */}
            <Card className="bg-muted/50 border-dashed">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  🛠️ <strong>Cave Forge Status:</strong> ⚒️
                  <br />
                  The mystical backend spirits are still perfecting their ancient algorithms. 
                  Epic transformations may require patience as the magic stabilizes!
                </p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CavemanAnalyzer;