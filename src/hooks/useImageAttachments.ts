import { fileToBase64 } from "@/helpers/capture-frame";
import { extractFramesFromVideo } from "@/lib/extractVideoFrames";
import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
} from "react";

const MAX_ATTACHED_IMAGES = 4;
const MAX_VIDEO_FRAMES = 20;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB per image
const MAX_FILE_SIZE_MB = MAX_FILE_SIZE_BYTES / (1024 * 1024);
const MAX_VIDEO_SIZE_BYTES = 200 * 1024 * 1024; // 200MB per video

export interface VideoInfo {
  fileName: string;
  duration: number;
  frameCount: number;
}

interface UseImageAttachmentsReturn {
  attachedImages: string[];
  isDragging: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  videoInfo: VideoInfo | null;
  isExtracting: boolean;
  extractProgress: { current: number; total: number } | null;
  addImages: (newImages: string[]) => void;
  removeImage: (index: number) => void;
  clearImages: () => void;
  handleFileSelect: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handlePaste: (e: ClipboardEvent) => Promise<void>;
  handleDragOver: (e: DragEvent) => void;
  handleDragLeave: (e: DragEvent) => void;
  handleDrop: (e: DragEvent) => Promise<void>;
  canAddMore: boolean;
  error: string | null;
  clearError: () => void;
}

// videoFileToFrameBase64 replaced by extractFramesFromVideo (multi-frame)

export function useImageAttachments(): UseImageAttachmentsReturn {
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState<{ current: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const filterValidFiles = useCallback((files: File[]): File[] => {
    const validFiles: File[] = [];
    const oversizedFiles: File[] = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        oversizedFiles.push(file);
      } else {
        validFiles.push(file);
      }
    }

    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map((f) => f.name).join(", ");
      setError(
        `${oversizedFiles.length === 1 ? "File" : "Files"} too large (max ${MAX_FILE_SIZE_MB}MB): ${fileNames}`,
      );
    }

    return validFiles;
  }, []);

  const addImages = useCallback((newImages: string[], isVideoFrames = false) => {
    const maxCount = isVideoFrames ? MAX_VIDEO_FRAMES : MAX_ATTACHED_IMAGES;
    setAttachedImages((prev) => {
      // Video frames replace everything; regular images append up to limit
      const combined = isVideoFrames ? newImages : [...prev, ...newImages];
      return combined.slice(0, maxCount);
    });
  }, []);

  const removeImage = useCallback((index: number) => {
    setAttachedImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next;
    });
    // Clear video info if no images remain (or if removing from video frames)
    setVideoInfo((prev) => prev);
  }, []);

  const clearImages = useCallback(() => {
    setAttachedImages([]);
    setVideoInfo(null);
    setExtractProgress(null);
  }, []);

  const processFiles = useCallback(
    async (files: File[]): Promise<{ images: string[]; isVideo: boolean }> => {
      // Handle video files (take the first video; ignore others)
      const videoFile = files.find((f) => f.type.startsWith("video/"));
      if (videoFile) {
        if (videoFile.size > MAX_VIDEO_SIZE_BYTES) {
          setError(`Video too large (max 200MB): ${videoFile.name}`);
          return { images: [], isVideo: true };
        }
        setIsExtracting(true);
        setExtractProgress({ current: 0, total: MAX_VIDEO_FRAMES });
        try {
          const { frames, duration } = await extractFramesFromVideo(
            videoFile,
            1,
            MAX_VIDEO_FRAMES,
            (current, total) => setExtractProgress({ current, total }),
          );
          setVideoInfo({ fileName: videoFile.name, duration, frameCount: frames.length });
          return { images: frames, isVideo: true };
        } catch (e) {
          setError(`Could not extract frames from video: ${videoFile.name}`);
          return { images: [], isVideo: true };
        } finally {
          setIsExtracting(false);
          setExtractProgress(null);
        }
      }

      // Regular image files
      const results: string[] = [];
      for (const file of files) {
        if (file.type.startsWith("image/")) {
          const base64 = await fileToBase64(file);
          results.push(base64);
        }
      }
      return { images: results, isVideo: false };
    },
    [],
  );

  const handleFileSelect = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      const mediaFiles = files.filter(
        (f) => f.type.startsWith("image/") || f.type.startsWith("video/"),
      );
      const validFiles = filterValidFiles(mediaFiles);
      if (validFiles.length > 0) {
        const { images, isVideo } = await processFiles(validFiles);
        if (images.length > 0) addImages(images, isVideo);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [addImages, filterValidFiles, processFiles],
  );

  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items);
      const imageItems = items.filter((item) => item.type.startsWith("image/"));
      if (imageItems.length > 0) {
        e.preventDefault();
        const files = imageItems
          .map((item) => item.getAsFile())
          .filter((f): f is File => f !== null);
        const validFiles = filterValidFiles(files);
        if (validFiles.length > 0) {
          const { images } = await processFiles(validFiles);
          if (images.length > 0) addImages(images, false);
        }
      }
    },
    [addImages, filterValidFiles, processFiles],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const mediaFiles = files.filter(
        (f) => f.type.startsWith("image/") || f.type.startsWith("video/"),
      );
      const validFiles = filterValidFiles(mediaFiles);
      if (validFiles.length > 0) {
        const { images, isVideo } = await processFiles(validFiles);
        if (images.length > 0) addImages(images, isVideo);
      }
    },
    [addImages, filterValidFiles, processFiles],
  );

  return {
    attachedImages,
    isDragging,
    fileInputRef,
    videoInfo,
    isExtracting,
    extractProgress,
    addImages,
    removeImage,
    clearImages,
    handleFileSelect,
    handlePaste,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    canAddMore: !videoInfo && attachedImages.length < MAX_ATTACHED_IMAGES,
    error,
    clearError,
  };
}
