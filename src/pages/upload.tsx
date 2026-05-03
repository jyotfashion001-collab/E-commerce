import { useState, useCallback } from "react";
import {
  useUploadPayments,
  getListPaymentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload as UploadIcon, FileSpreadsheet, CheckCircle2, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { parsePaymentsFile } from "@/lib/payments-store";
import type { Platform } from "@/lib/platform-import";

const PLATFORM_LABELS: Record<Platform, string> = {
  meesho: "Meesho",
  flipkart: "Flipkart",
  amazon: "Amazon",
};

const PLATFORM_TINT: Record<Platform, string> = {
  meesho: "bg-[#e83e8c]/10 text-[#e83e8c] border-[#e83e8c]/20",
  flipkart: "bg-[#007bff]/10 text-[#007bff] border-[#007bff]/20",
  amazon: "bg-[#fd7e14]/10 text-[#fd7e14] border-[#fd7e14]/20",
};

export default function Upload() {
  const [paymentPlatform, setPaymentPlatform] = useState<Platform>("meesho");
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paymentDragging, setPaymentDragging] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{
    inserted: number;
    updated: number;
    deduped: number;
    skipped: number;
    name: string;
    platform: Platform;
  } | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const uploadPaymentsMutation = useUploadPayments();

  const acceptPaymentFile = useCallback(
    (f: File | undefined) => {
      if (!f) return;
      if (!/\.(xlsx|xls)$/i.test(f.name)) {
        toast({
          title: "Invalid file",
          description: "Please upload a payment .xlsx or .xls file",
          variant: "destructive",
        });
        return;
      }
      setPaymentFile(f);
      setPaymentResult(null);
    },
    [toast],
  );

  const handlePaymentDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setPaymentDragging(false);
      acceptPaymentFile(e.dataTransfer.files[0]);
    },
    [acceptPaymentFile],
  );

  const processPaymentFile = async () => {
    if (!paymentFile) return;
    setPaymentProcessing(true);
    try {
      const parsed = await parsePaymentsFile(paymentFile, paymentPlatform);
      if (!parsed.ok) {
        toast({
          title: "Could not import",
          description: parsed.error,
          variant: "destructive",
        });
        return;
      }
      const result = await uploadPaymentsMutation.mutateAsync({
        data: { rows: parsed.rows },
      });
      queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
      setPaymentResult({
        inserted: result.inserted,
        updated: result.updated,
        deduped: result.deduped,
        skipped: result.skipped,
        name: paymentFile.name,
        platform: paymentPlatform,
      });
      setPaymentFile(null);
      const parts: string[] = [];
      if (result.inserted) parts.push(`${result.inserted} new`);
      if (result.updated) parts.push(`${result.updated} updated`);
      if (result.deduped)
        parts.push(
          `${result.deduped} duplicate${result.deduped === 1 ? "" : "s"} merged`,
        );
      if (result.skipped) parts.push(`${result.skipped} errors`);
      toast({
        title: `${PLATFORM_LABELS[paymentPlatform]} payments imported`,
        description: parts.length ? parts.join(" · ") : "No records to import.",
        variant: result.skipped > 0 ? "destructive" : "default",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Import failed",
        description:
          err instanceof Error ? err.message : "Failed to upload payments.",
        variant: "destructive",
      });
    } finally {
      setPaymentProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Upload Payment
        </h1>
        <p className="text-muted-foreground mt-1">
          Drop your marketplace payment / settlement Excel and we'll handle the rest.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Choose marketplace</CardTitle>
          <CardDescription>
            Each marketplace has a different payment / settlement file.
            Choose the one that matches your file — every row will be
            tagged with this platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={paymentPlatform}
            onValueChange={(v) => {
              setPaymentPlatform(v as Platform);
              setPaymentFile(null);
              setPaymentResult(null);
            }}
          >
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="meesho">Meesho</TabsTrigger>
              <TabsTrigger value="flipkart">Flipkart</TabsTrigger>
              <TabsTrigger value="amazon">Amazon</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            Importing as
            <Badge
              variant="outline"
              className={`capitalize ${PLATFORM_TINT[paymentPlatform]}`}
            >
              {PLATFORM_LABELS[paymentPlatform]}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Upload payment file</CardTitle>
          <CardDescription>
            Drop your {PLATFORM_LABELS[paymentPlatform]} payment /
            settlement Excel (.xlsx, .xls). The header row is detected
            automatically and existing payments are updated by Sub Order
            No / Order ID.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setPaymentDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setPaymentDragging(false);
            }}
            onDrop={handlePaymentDrop}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              paymentDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/50"
            }`}
          >
            <input
              type="file"
              id="payment-file-upload"
              className="hidden"
              accept=".xls,.xlsx"
              onChange={(e) => {
                acceptPaymentFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />

            {paymentFile ? (
              <div className="flex flex-col items-center gap-4">
                <FileSpreadsheet className="h-14 w-14 text-primary" />
                <div>
                  <p className="text-lg font-medium">{paymentFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(paymentFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <div className="flex gap-3 mt-2">
                  <Button
                    variant="outline"
                    onClick={() => setPaymentFile(null)}
                    disabled={paymentProcessing}
                  >
                    Remove
                  </Button>
                  <Button
                    onClick={processPaymentFile}
                    disabled={paymentProcessing}
                  >
                    {paymentProcessing ? "Processing..." : "Import Payments"}
                  </Button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="payment-file-upload"
                className="cursor-pointer flex flex-col items-center gap-4"
              >
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-medium">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    .XLSX or .XLS — {PLATFORM_LABELS[paymentPlatform]}{" "}
                    payment file
                  </p>
                </div>
              </label>
            )}
          </div>

          {paymentResult && (
            <div className="flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-50 dark:bg-green-950/20 p-4">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                  Import successful
                  <Badge
                    variant="outline"
                    className={`capitalize ${PLATFORM_TINT[paymentResult.platform]}`}
                  >
                    {PLATFORM_LABELS[paymentResult.platform]}
                  </Badge>
                </p>
                <p className="text-sm text-green-600 dark:text-green-500 mt-0.5">
                  {paymentResult.inserted} new · {paymentResult.updated}{" "}
                  updated
                  {paymentResult.deduped > 0
                    ? ` · ${paymentResult.deduped} duplicate${paymentResult.deduped === 1 ? "" : "s"} merged`
                    : ""}{" "}
                  from{" "}
                  <span className="font-medium">{paymentResult.name}</span>.
                </p>
                <button
                  className="mt-2 text-sm font-medium text-green-700 dark:text-green-400 underline underline-offset-2 hover:no-underline"
                  onClick={() => navigate("/payments")}
                >
                  View in Payments table →
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
