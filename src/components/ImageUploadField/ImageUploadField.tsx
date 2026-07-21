"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, Link, Clipboard, X, Loader2 } from "lucide-react";
import { API_URL } from "@/config/hosts";
import styles from "./ImageUploadField.module.scss";

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  accept?: string;
  /** Endpoint that accepts a multipart "file" field and returns { url }. */
  uploadEndpoint?: string;
}

export default function ImageUploadField({
  label,
  value,
  onChange,
  placeholder = "https://example.com/image.png",
  accept = "image/*",
  uploadEndpoint = `${API_URL}/api/collaboration-requests/upload-image`,
}: ImageUploadFieldProps) {
  const [uploadMethod, setUploadMethod] = useState<"url" | "file" | "clipboard">("url");
  const [tempUrl, setTempUrl] = useState(value);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteZoneRef = useRef<HTMLDivElement>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Sync tempUrl with value when value changes externally
  useEffect(() => {
    setTempUrl(value);
  }, [value]);

  // Focus the paste zone when switching to clipboard mode
  useEffect(() => {
    if (uploadMethod === "clipboard") {
      pasteZoneRef.current?.focus();
    }
  }, [uploadMethod]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setTempUrl(url);
    onChange(url);
  };

  // Upload a file/blob to S3 and store only the returned URL.
  const uploadImage = async (file: File | Blob) => {
    setUploading(true);
    setPasteError(null);

    // Optimistic local preview while the upload is in flight.
    const localPreview = URL.createObjectURL(file);
    setTempUrl(localPreview);

    try {
      const formData = new FormData();
      const named =
        file instanceof File
          ? file
          : new File([file], "pasted-image", { type: file.type || "image/png" });
      formData.append("file", named);

      const res = await fetch(uploadEndpoint, { method: "POST", body: formData });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const data = await res.json();
      if (!data.url) throw new Error("No url in response");

      setTempUrl(data.url);
      onChange(data.url);
    } catch (err) {
      console.error("Failed to upload image:", err);
      setTempUrl(value);
      onChange(value);
      setPasteError("Не удалось загрузить изображение");
      setTimeout(() => setPasteError(null), 3000);
    } finally {
      URL.revokeObjectURL(localPreview);
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadImage(file);
    // Allow selecting the same file again later.
    e.target.value = "";
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const data = e.clipboardData;
    if (!data) return;

    // Prefer an image file (screenshot / Win+V / copied file)
    for (const file of Array.from(data.files)) {
      if (file.type.startsWith("image/")) {
        uploadImage(file);
        return;
      }
    }
    for (const item of Array.from(data.items)) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          uploadImage(file);
          return;
        }
      }
    }

    // Fall back to a pasted image URL string
    const text = data.getData("text");
    if (text && /^https?:\/\//i.test(text.trim())) {
      const url = text.trim();
      setTempUrl(url);
      onChange(url);
      return;
    }

    setPasteError("В буфере нет изображения");
    setTimeout(() => setPasteError(null), 3000);
  };

  const clearImage = () => {
    setTempUrl("");
    onChange("");
    if (uploadMethod === "clipboard") {
      pasteZoneRef.current?.focus();
    }
  };

  return (
    <div className={styles.imageUploadField}>
      <label>{label}</label>

      {/* Method selector */}
      <div className={styles.methodSelector}>
        <button
          type="button"
          className={`${styles.methodBtn} ${uploadMethod === "url" ? styles.methodBtnActive : ""}`}
          onClick={() => setUploadMethod("url")}
        >
          <Link size={14} />
          Ссылка
        </button>
        <button
          type="button"
          className={`${styles.methodBtn} ${uploadMethod === "file" ? styles.methodBtnActive : ""}`}
          onClick={() => {
            setUploadMethod("file");
            fileInputRef.current?.click();
          }}
        >
          <Upload size={14} />
          Файл
        </button>
        <button
          type="button"
          className={`${styles.methodBtn} ${uploadMethod === "clipboard" ? styles.methodBtnActive : ""}`}
          onClick={() => setUploadMethod("clipboard")}
        >
          <Clipboard size={14} />
          Вставить
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </div>

      {/* URL input */}
      {uploadMethod === "url" && (
        <input
          type="text"
          value={tempUrl}
          onChange={handleUrlChange}
          placeholder={placeholder}
          className={styles.urlInput}
        />
      )}

      {/* Paste zone */}
      {uploadMethod === "clipboard" && !tempUrl && (
        <div
          ref={pasteZoneRef}
          className={`${styles.pasteZone} ${pasteError ? styles.pasteZoneError : ""}`}
          tabIndex={0}
          role="button"
          onPaste={handlePaste}
          onClick={() => pasteZoneRef.current?.focus()}
        >
          <Clipboard size={22} />
          <span className={styles.pasteZoneTitle}>
            {pasteError ?? "Нажмите сюда и вставьте картинку"}
          </span>
          <span className={styles.pasteZoneHint}>
            Ctrl+V — вставить из буфера. Win+V — открыть журнал буфера, выбрать картинку, затем Ctrl+V сюда.
          </span>
        </div>
      )}

      {/* Preview */}
      {tempUrl && (
        <div className={styles.previewContainer}>
          <img
            src={tempUrl}
            alt="Preview"
            className={styles.previewImage}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          {uploading && (
            <div className={styles.uploadingOverlay}>
              <Loader2 size={22} className={styles.spinner} />
              <span>Загрузка...</span>
            </div>
          )}
          {!uploading && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={clearImage}
              aria-label="Очистить изображение"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* File placeholder */}
      {uploadMethod === "file" && !tempUrl && (
        <div className={styles.previewContainer}>
          <div className={styles.placeholder}>
            {uploading ? "Загрузка..." : "Выберите файл изображения"}
          </div>
        </div>
      )}
    </div>
  );
}
