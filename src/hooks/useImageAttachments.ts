import { fileToBase64 } from "@/helpers/capture-frame";
import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
} from "react";

const MAX_ATTACHED_IMAGES = 4;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB per image
const MAX_FILE_SIZE_MB = MAX_FILE_SIZE_BYTES / (1024 * 1024);

interface UseImageAttachmentsReturn {
  attachedImages: string[];
  isDragging: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
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

async function videoFileToFrameBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      // Seek to 1 second, or to 10% of duration if video is short
      video.currentTime = Math.min(1, video.duration * 0.1);
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not get canvas context"));
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");
      URL.revokeObjectURL(url);
      // Return base64 portion only (strip the data:image/png;base64, prefix)
      resolve(dataUrl);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video"));
    };

    video.src = url;
  });
}

export function useImageAttachments(): UseImageAttachmentsReturn {
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const addImages = useCallback((newImages: string[]) => {
    setAttachedImages((prev) => {
      const combined = [...prev, ...newImages];
      return combined.slice(0, MAX_ATTACHED_IMAGES);
    });
  }, []);

  const removeImage = useCallback((index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearImages = useCallback(() => {
    setAttachedImages([]);
  }, []);

  const processFiles = useCallback(
    async (files: File[]): Promise<string[]> => {
      const results: string[] = [];
      for (const file of files) {
        if (file.type.startsWith("video/")) {
          try {
            const frame = await videoFileToFrameBase64(file);
            results.push(frame);
          } catch {
            setError(`Could not extract frame from video: ${file.name}`);
          }
        } else if (file.type.startsWith("image/")) {
          const base64 = await fileToBase64(file);
          results.push(base64);
        }
      }
      return results;
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
        const base64Images = await processFiles(validFiles);
        addImages(base64Images);
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
          const base64Images = await processFiles(validFiles);
          addImages(base64Images);
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
        const base64Images = await processFiles(validFiles);
        addImages(base64Images);
      }
    },
    [addImages, filterValidFiles, processFiles],
  );

  return {
    attachedImages,
    isDragging,
    fileInputRef,
    addImages,
    removeImage,
    clearImages,
    handleFileSelect,
    handlePaste,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    canAddMore: attachedImages.length < MAX_ATTACHED_IMAGES,
    error,
    clearError,
  };
}
