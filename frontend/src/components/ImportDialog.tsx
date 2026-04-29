import { useState, useCallback, useRef } from "react";
import { Upload, X, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import * as XLSX from "xlsx";

export interface ImportField {
  key: string;
  label: string;
  aliases?: string[];
  required?: boolean;
  validate?: (value: string) => boolean;
  normalize?: (value: string) => string;
}

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: "contact" | "entity";
  fields: ImportField[];
  onImport: (rows: Record<string, string>[]) => void;
}

interface ParsedRow {
  data: Record<string, string>;
  errors: string[];
  valid: boolean;
}

export default function ImportDialog({ open, onOpenChange, domain, fields, onImport }: ImportDialogProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parsing, setParsing] = useState(false);

  const reset = () => {
    setFile(null);
    setParsedRows([]);
    setParsing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([fields.map((f) => f.label)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, domain === "contact" ? "Contacts" : "Entities");
    XLSX.writeFile(wb, `${domain}_template.xlsx`);
  };

  const parseFile = useCallback(
    async (f: File) => {
      setParsing(true);
      setFile(f);
      try {
        const ab = await f.arrayBuffer();
        const wb = XLSX.read(ab, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (jsonData.length < 2) {
          setParsedRows([]);
          setParsing(false);
          return;
        }

        const headers = jsonData[0].map((h) => String(h).trim());
        const dataRows = jsonData.slice(1).filter((row) => row.some((cell) => cell !== undefined && cell !== ""));

        const rows: ParsedRow[] = dataRows.map((row) => {
          const data: Record<string, string> = {};
          const errors: string[] = [];

          fields.forEach((field) => {
            const allNames = [field.key, field.label, ...(field.aliases || [])];
            const headerIdx = headers.findIndex((h) =>
              allNames.some((name) => h === name)
            );
            const rawVal = headerIdx >= 0 ? String(row[headerIdx] ?? "").trim() : "";
            const val = rawVal && field.normalize ? field.normalize(rawVal) : rawVal;
            data[field.key] = val;

            if (field.required && !val) {
              errors.push(`${field.label} is required`);
            }
            if (rawVal && field.validate && !field.validate(rawVal)) {
              errors.push(`${field.label} is invalid`);
            }
          });

          return { data, errors, valid: errors.length === 0 };
        });

        setParsedRows(rows);
      } catch {
        setParsedRows([]);
      }
      setParsing(false);
    },
    [fields]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) parseFile(f);
    },
    [parseFile]
  );

  const validCount = parsedRows.filter((r) => r.valid).length;
  const invalidCount = parsedRows.filter((r) => !r.valid).length;
  const canImport = parsedRows.length > 0 && invalidCount === 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t(`import.title.${domain}`)}</DialogTitle>
        </DialogHeader>

        {!file ? (
          <div className="space-y-4">
            <div
              className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors ${
                dragging ? "border-primary bg-primary/5" : "border-border"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-foreground">
                {t("import.dragDrop")}{" "}
                <button
                  type="button"
                  className="text-primary font-medium hover:underline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t("import.browse")}
                </button>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("import.supported")}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) parseFile(f);
                }}
              />
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4" />
                {t("import.downloadTemplate")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button onClick={reset} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {parsing ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t("import.parsing")}</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">
                    {t("import.preview")} ({parsedRows.length})
                  </p>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-green-600 dark:text-green-400 font-medium">{validCount} {t("import.valid")}</span>
                    {invalidCount > 0 && (
                      <span className="text-destructive font-medium">{invalidCount} {t("import.invalid")}</span>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground w-10">#</th>
                        {fields.slice(0, 8).map((f) => (
                          <th key={f.key} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap text-xs uppercase">
                            {f.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((row, i) => (
                        <tr
                          key={i}
                          className={`border-b border-border last:border-0 ${!row.valid ? "bg-destructive/5" : ""}`}
                        >
                          <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                          {fields.slice(0, 8).map((f) => {
                            const hasError = row.errors.some((e) => e.startsWith(f.label));
                            return (
                              <td key={f.key} className={`px-3 py-2 whitespace-nowrap ${hasError ? "text-destructive" : "text-foreground"}`}>
                                <div className="flex items-center gap-1">
                                  {row.data[f.key] || "—"}
                                  {hasError && <AlertCircle className="h-3 w-3 text-destructive flex-shrink-0" />}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {invalidCount > 0 && (
                  <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p>{t("import.fixErrors")}</p>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => handleClose(false)}>
                {t("import.cancel")}
              </Button>
              <Button disabled={!canImport} onClick={() => { onImport(parsedRows.filter(r => r.valid).map(r => r.data)); handleClose(false); }}>
                <CheckCircle2 className="h-4 w-4" />
                {t("import.import")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
