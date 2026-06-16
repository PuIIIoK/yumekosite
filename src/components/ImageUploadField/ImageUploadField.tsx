"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, Link, Clipboard, X } from "lucide-react";
import styles from "./ImageUploadField.module.scss";

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  accept?: string;
}

export default function ImageUploadField({
  label,
  value,
  onChange,
  placeholder = "https://example.com/image.png",
  accept = "image/*",
}: ImageUploadFieldProps) {
  const [uploadMethod, setUploadMethod] = useState<"url" | "file" | "clipboard">("url");
  const [tempUrl, setTempUrl] = useState(value);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clipboardStatus, setClipboardStatus] = useState<"idle" | "checking" | "success" | "error">("idle");

  // Sync tempUrl with value when value changes externally
  useEffect(() => {
    setTempUrl(value);
  }, [value]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setTempUrl(url);
    onChange(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setTempUrl(result);
      onChange(result);
    };
    reader.readAsDataURL(file);
  };

  const checkClipboard = async () => {
    setClipboardStatus("checking");
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            const url = URL.createObjectURL(blob);
            setTempUrl(url);
            onChange(url);
            setClipboardStatus("success");
            setTimeout(() => setClipboardStatus("idle"), 2000);
            return;
          }
        }
      }
      setClipboardStatus("error");
      setTimeout(() => setClipboardStatus("idle"), 2000);
    } catch (error) {
      console.error("Failed to read clipboard:", error);
      setClipboardStatus("error");
      setTimeout(() => setClipboardStatus("idle"), 2000);
    }
  };

  const clearImage = () => {
    setTempUrl("");
    onChange("");
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
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={14} />
          Файл
        </button>
        <button
          type="button"
          className={`${styles.methodBtn} ${uploadMethod === "clipboard" ? styles.methodBtnActive : ""}`}
          onClick={checkClipboard}
          disabled={clipboardStatus === "checking"}
        >
          <Clipboard size={14} />
          {clipboardStatus === "checking" 
            ? "Проверка..." 
            : clipboardStatus === "success"
              ? "✅ Вставлено!"
              : clipboardStatus === "error"
                ? "❌ Ошибка"
                : "Буфер"}
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

      {/* Preview */}
      {(tempUrl || uploadMethod !== "url") && (
        <div className={styles.previewContainer}>
          {tempUrl && (
            <img
              src={tempUrl}
              alt="Preview"
              className={styles.previewImage}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          {tempUrl && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={clearImage}
              aria-label="Очистить изображение"
            >
              <X size={16} />
            </button>
          )}
          {!tempUrl && uploadMethod !== "url" && (
            <div className={styles.placeholder}>
              {uploadMethod === "file" && "Выберите файл изображения"}
              {uploadMethod === "clipboard" && 
                (clipboardStatus === "idle" 
                  ? "Вставьте изображение из буфера обмена" 
                  : clipboardStatus === "checking"
                    ? "Проверка буфера..."
                    : clipboardStatus === "success"
                      ? "Изображение вставлено!"
                      : "Не удалось вставить изображение")
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}