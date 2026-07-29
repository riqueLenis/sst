import React, { useEffect, useRef, useState } from "react";
import { Camera, ImageUp, RefreshCcw, Trash2, X } from "lucide-react";
import { cn } from "../lib/utils";

const MAX_WIDTH = 720;
const MAX_HEIGHT = 960;
const IMAGE_QUALITY = 0.78;

type FacePhotoCaptureProps = {
  value?: string;
  subjectName?: string;
  onChange: (value: string) => void;
  onClear: () => void;
  className?: string;
  error?: string | null;
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Falha ao ler a imagem selecionada."));
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error("Falha ao carregar a imagem."));
    };

    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Falha ao processar a imagem."));
    image.src = src;
  });
}

// Desenha uma origem (imagem ou vídeo) num canvas redimensionado e retorna JPEG.
function drawToJpeg(
  source: HTMLImageElement | HTMLVideoElement,
  sourceWidth: number,
  sourceHeight: number,
) {
  const scale = Math.min(
    MAX_WIDTH / sourceWidth,
    MAX_HEIGHT / sourceHeight,
    1,
  );
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Falha ao preparar a foto capturada.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
}

async function compressFacePhoto(file: File) {
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  return drawToJpeg(image, image.width, image.height);
}

const supportsCamera = () =>
  typeof navigator !== "undefined" &&
  Boolean(navigator.mediaDevices?.getUserMedia);

export default function FacePhotoCapture({
  value,
  subjectName,
  onChange,
  onClear,
  className,
  error,
}: FacePhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Libera a câmera (para as tracks). Sem isso, a câmera fica "presa" e a
  // próxima abertura pode vir preta.
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const closeCamera = () => {
    stopStream();
    setIsCameraOpen(false);
  };

  // Garante que a câmera seja liberada ao desmontar (ex.: fechar o modal).
  useEffect(() => stopStream, []);

  // Conecta o stream ao elemento de vídeo assim que a câmera abre.
  useEffect(() => {
    const video = videoRef.current;
    if (isCameraOpen && video && streamRef.current) {
      video.srcObject = streamRef.current;
      const playPromise = video.play();
      if (playPromise) {
        playPromise.catch(() => {
          /* alguns navegadores rejeitam play() silenciosamente */
        });
      }
    }
  }, [isCameraOpen]);

  const openPicker = () => {
    inputRef.current?.click();
  };

  const clearInput = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const startCamera = async () => {
    setProcessingError(null);

    if (!supportsCamera()) {
      setProcessingError(
        "Câmera ao vivo indisponível neste dispositivo. Use \"Enviar foto\".",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraOpen(true);
    } catch {
      setProcessingError(
        "Não foi possível acessar a câmera. Verifique a permissão do navegador ou use \"Enviar foto\".",
      );
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setProcessingError("Aguarde a câmera carregar antes de capturar.");
      return;
    }

    try {
      const dataUrl = drawToJpeg(video, video.videoWidth, video.videoHeight);
      onChange(dataUrl);
      setProcessingError(null);
    } catch (captureError) {
      setProcessingError(
        captureError instanceof Error
          ? captureError.message
          : "Não foi possível capturar a foto.",
      );
    } finally {
      closeCamera();
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsProcessing(true);
    setProcessingError(null);

    try {
      const compressedPhoto = await compressFacePhoto(file);
      onChange(compressedPhoto);
    } catch (captureError) {
      setProcessingError(
        captureError instanceof Error
          ? captureError.message
          : "Não foi possível capturar a foto facial.",
      );
    } finally {
      clearInput();
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    clearInput();
    setProcessingError(null);
    closeCamera();
    onClear();
  };

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Camera className="h-4 w-4 text-blue-600" />
            Captura facial do colaborador
          </p>
          <p className="mt-1 text-xs text-slate-500">
            A câmera abre dentro da própria tela. Se preferir, envie uma foto do
            dispositivo.
          </p>
          {subjectName && (
            <p className="mt-1 text-xs font-medium text-slate-600">
              Colaborador selecionado: {subjectName}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {!isCameraOpen && (
            <button
              type="button"
              onClick={startCamera}
              disabled={isProcessing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-50"
            >
              {value ? (
                <RefreshCcw className="h-3.5 w-3.5" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
              {value ? "Refazer foto" : "Abrir câmera"}
            </button>
          )}

          <button
            type="button"
            onClick={openPicker}
            disabled={isProcessing || isCameraOpen}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-50"
          >
            <ImageUp className="h-3.5 w-3.5" />
            Enviar foto
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={(!value && !isCameraOpen) || isProcessing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remover
          </button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-2xl border bg-white shadow-sm",
          error || processingError
            ? "border-red-200 ring-2 ring-red-100"
            : "border-slate-200",
        )}
      >
        {isCameraOpen ? (
          <div className="relative bg-slate-950">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="block h-72 w-full object-cover sm:h-80"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-gradient-to-t from-slate-950/80 to-transparent p-4">
              <button
                type="button"
                onClick={capturePhoto}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-colors hover:bg-blue-700"
              >
                <Camera className="h-4 w-4" />
                Tirar foto
              </button>
              <button
                type="button"
                onClick={closeCamera}
                className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-lg transition-colors hover:bg-white"
              >
                <X className="h-4 w-4" />
                Cancelar
              </button>
            </div>
          </div>
        ) : value ? (
          <div className="relative overflow-hidden bg-slate-950">
            <img
              src={value}
              alt={
                subjectName
                  ? `Foto facial de ${subjectName}`
                  : "Foto facial do colaborador"
              }
              className="block h-72 w-full object-cover sm:h-80"
            />
          </div>
        ) : (
          <div className="flex min-h-72 flex-col items-center justify-center gap-3 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.98))] px-5 py-8 text-center sm:min-h-80">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Camera className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">
                Capture o rosto do colaborador
              </p>
              <p className="max-w-xs text-xs leading-5 text-slate-500">
                Centralize o rosto, use boa iluminação e evite cortes. Essa foto
                será vinculada ao comprovante da entrega.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1 text-xs">
        <p
          className={value ? "font-medium text-emerald-700" : "text-slate-500"}
        >
          {isProcessing
            ? "Processando foto..."
            : isCameraOpen
              ? "Posicione o rosto e toque em \"Tirar foto\"."
              : value
                ? "Foto facial registrada. Se alterar os dados da entrega, recapture a foto."
                : "A foto facial é obrigatória para concluir a entrega."}
        </p>
        {(processingError || error) && (
          <p className="font-medium text-red-600">{processingError || error}</p>
        )}
      </div>
    </div>
  );
}
