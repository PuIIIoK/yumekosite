"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import styles from "./CropModal.module.scss";

type Props = {
  imageSrc: string;
  aspect: number;
  onApply: (croppedFile: File) => void;
  onCancel: () => void;
};

function getCroppedCanvas(image: HTMLImageElement, crop: PixelCrop): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width * scaleX;
  canvas.height = crop.height * scaleY;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return canvas;
}

export default function CropModal({ imageSrc, aspect, onApply, onCancel }: Props) {
  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    width: 90,
    height: 90 / aspect,
    x: 5,
    y: 5,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const mouseDownOnOverlay = useRef(false);

  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    mouseDownOnOverlay.current = e.target === overlayRef.current;
  };

  const handleOverlayMouseUp = (e: React.MouseEvent) => {
    if (mouseDownOnOverlay.current && e.target === overlayRef.current) {
      onCancel();
    }
    mouseDownOnOverlay.current = false;
  };

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      imgRef.current = e.currentTarget;
      const { width, height } = e.currentTarget;
      const cropW = width * 0.9;
      const cropH = cropW / aspect;
      const y = (height - cropH) / 2;
      const x = (width - cropW) / 2;
      const newCrop: Crop = {
        unit: "px",
        width: cropW,
        height: Math.min(cropH, height * 0.95),
        x: Math.max(x, 0),
        y: Math.max(y, 0),
      };
      setCrop(newCrop);
    },
    [aspect]
  );

  const handleApply = () => {
    if (!imgRef.current || !completedCrop) return;
    const canvas = getCroppedCanvas(imgRef.current, completedCrop);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "cropped-banner.jpg", { type: "image/jpeg" });
        onApply(file);
      },
      "image/jpeg",
      0.92
    );
  };

  return (
    <div className={styles.overlay} ref={overlayRef} onMouseDown={handleOverlayMouseDown} onMouseUp={handleOverlayMouseUp}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <span className={styles.title}>Обрезка баннера</span>
        <div className={styles.cropArea}>
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
          >
            <img src={imageSrc} onLoad={onImageLoad} alt="crop" />
          </ReactCrop>
        </div>
        <div className={styles.actions}>
          <button className={styles.btnCancel} onClick={onCancel}>
            Отмена
          </button>
          <button className={styles.btnApply} onClick={handleApply}>
            Применить
          </button>
        </div>
      </div>
    </div>
  );
}
