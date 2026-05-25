"use client";

import { useState } from "react";
import { Download, FileText, Printer } from "lucide-react";

import type { ReportType } from "@/lib/admin/reports";
import { Button } from "@/components/ui/button";

const REPORTS: {
  type: ReportType;
  title: string;
  description: string;
  formats: ("csv" | "pdf")[];
}[] = [
  {
    type: "student_progress",
    title: "Student Progress Report",
    description: "All students × all modules — status, score, dates",
    formats: ["csv", "pdf"],
  },
  {
    type: "trainer_activity",
    title: "Trainer Activity Report",
    description: "Reviews done, avg time, approval rates",
    formats: ["csv"],
  },
  {
    type: "token_economy",
    title: "Token Economy Report",
    description: "Usage by student, type, and date",
    formats: ["csv"],
  },
  {
    type: "cohort_performance",
    title: "Cohort Performance Report",
    description: "Module completion rates per cohort",
    formats: ["csv"],
  },
  {
    type: "ai_usage",
    title: "AI Usage Report",
    description: "Tutor conversations, code reviews, common questions",
    formats: ["csv"],
  },
];

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsClient() {
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);
  const [lastCsv, setLastCsv] = useState<string | null>(null);

  async function generate(type: ReportType) {
    setGenerating(type);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_type: type,
          date_range:
            dateStart && dateEnd
              ? { start: dateStart, end: dateEnd }
              : undefined,
        }),
      });
      if (res.ok) {
        const { csv, filename } = await res.json();
        setLastCsv(csv);
        downloadCsv(csv, filename);
      }
    } finally {
      setGenerating(null);
    }
  }

  function printReport() {
    window.print();
  }

  return (
    <div className="space-y-8 print:text-black">
      <div>
        <h1 className="font-display text-2xl font-bold text-orange-300">
          Platform Reports
        </h1>
        <p className="text-sm text-muted-foreground">
          Generate and download analytics reports
        </p>
      </div>

      <div className="flex flex-wrap gap-3 print:hidden">
        <input
          type="date"
          value={dateStart}
          onChange={(e) => setDateStart(e.target.value)}
          className="rounded-lg border border-orange-500/20 bg-background/50 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={dateEnd}
          onChange={(e) => setDateEnd(e.target.value)}
          className="rounded-lg border border-orange-500/20 bg-background/50 px-3 py-2 text-sm"
        />
        <span className="self-center text-xs text-muted-foreground">
          Optional date range filter
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 print:hidden">
        {REPORTS.map((report) => (
          <div
            key={report.type}
            className="rounded-xl border border-orange-500/15 bg-card/50 p-5"
          >
            <div className="mb-2 flex items-start gap-3">
              <FileText className="mt-0.5 size-5 text-orange-400" />
              <div>
                <h3 className="font-display font-semibold text-orange-200">
                  {report.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {report.description}
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                onClick={() => void generate(report.type)}
                disabled={generating === report.type}
                className="gap-2 bg-orange-600 hover:bg-orange-500"
              >
                <Download className="size-3" />
                {generating === report.type ? "Generating…" : "Generate CSV"}
              </Button>
              {report.formats.includes("pdf") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void generate(report.type).then(printReport);
                  }}
                  className="gap-2 border-orange-500/30"
                >
                  <Printer className="size-3" />
                  PDF (Print)
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {lastCsv && (
        <div className="hidden print:block">
          <pre className="whitespace-pre-wrap text-xs">{lastCsv}</pre>
        </div>
      )}
    </div>
  );
}
