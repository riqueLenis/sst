import React, { useCallback, useEffect, useRef } from "react";
import { PenLine, RotateCcw } from "lucide-react";
import { cn } from "../lib/utils";

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 280;

type SignaturePadProps = {
  value?: string;
  signerName?: string;
  onChange: (value: string) => void;
  onClear: () => void;
  className?: string;
  error?: string | null;
};

type Point = {
  x: number;
  y: number;
};

function getCanvasPoint(
  event: React.PointerEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
): Point {
  const rect = canvas.getBoundingClientRect();

  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
}

export default function SignaturePad({
  value,
  signerName,
  onChange,
  onClear,
  className,
  error,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);

  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 4;
    context.strokeStyle = "#0f172a";

    return context;
  }, []);

  const prepareCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const context = getContext();

    if (!canvas || !context) {
      return null;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    return context;
  }, [getContext]);

  const redrawSignature = useCallback(() => {
    const canvas = canvasRef.current;
    const context = prepareCanvas();

    if (!canvas || !context || !value) {
      return;
    }

    const image = new Image();
    image.onload = () => {
      const liveCanvas = canvasRef.current;
      const liveContext = getContext();

      if (!liveCanvas || !liveContext) {
        return;
      }

      prepareCanvas();

      const padding = 18;
      liveContext.drawImage(
        image,
        padding,
        padding,
        liveCanvas.width - padding * 2,
        liveCanvas.height - padding * 2,
      );
    };
    image.src = value;
  }, [getContext, prepareCanvas, value]);

  useEffect(() => {
    redrawSignature();
  }, [redrawSignature]);

  const commitSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    onChange(canvas.toDataURL("image/png"));
  }, [onChange]);

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = getContext();

    if (!canvas || !context) {
      return;
    }

    event.preventDefault();
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);

    const point = getCanvasPoint(event, canvas);
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.lineTo(point.x, point.y);
    context.stroke();

    lastPointRef.current = point;
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const context = getContext();

    if (!canvas || !context) {
      return;
    }

    event.preventDefault();
    const point = getCanvasPoint(event, canvas);
    const lastPoint = lastPointRef.current ?? point;

    context.beginPath();
    context.moveTo(lastPoint.x, lastPoint.y);
    context.lineTo(point.x, point.y);
    context.stroke();

    lastPointRef.current = point;
  };

  const finishStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    drawingRef.current = false;
    lastPointRef.current = null;
    commitSignature();
  };

  const handleClear = () => {
    drawingRef.current = false;
    lastPointRef.current = null;
    prepareCanvas();
    onClear();
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <PenLine className="h-4 w-4 text-blue-600" />
            Assinatura digital do colaborador
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Assine no quadro abaixo para liberar o salvamento da entrega.
          </p>
          {signerName && (
            <p className="mt-1 text-xs font-medium text-slate-600">
              Assinante selecionado: {signerName}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleClear}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Limpar assinatura
        </button>
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-2xl border bg-white shadow-sm",
          error ? "border-red-200 ring-2 ring-red-100" : "border-slate-200",
        )}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          className="block h-44 w-full cursor-crosshair bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.98))]"
          style={{ touchAction: "none" }}
          aria-label="Campo para assinatura digital do colaborador"
        />
      </div>

      <div className="flex flex-col gap-1 text-xs">
        <p
          className={value ? "font-medium text-emerald-700" : "text-slate-500"}
        >
          {value
            ? "Assinatura registrada. Altere qualquer dado da entrega e assine novamente."
            : "A assinatura é obrigatória para concluir a entrega."}
        </p>
        {error && <p className="font-medium text-red-600">{error}</p>}
      </div>
    </div>
  );
}
