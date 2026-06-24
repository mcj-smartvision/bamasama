"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/modules/database/supabase";

type Report = {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  ai_analysis: string | null;
  status: string | null;
  created_at: string;
};

type ReportsArchiveProps = {
  refreshKey: number;
};

export default function ReportsArchive({ refreshKey }: ReportsArchiveProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchReports() {
    try {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("reports")
        .select("id, title, description, image_url, ai_analysis, status, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      setReports(data || []);
    } catch (err: any) {
      console.error("Archive fetch error:", err);
      setError(err.message || "خطا در دریافت آرشیو گزارش‌ها");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports();
  }, [refreshKey]);

  function getStatusLabel(status: string | null) {
    switch (status) {
      case "completed":
        return "تکمیل‌شده";
      case "processing":
        return "در حال پردازش";
      case "failed":
        return "ناموفق";
      default:
        return status || "نامشخص";
    }
  }

  function getStatusClass(status: string | null) {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700 border-green-200";
      case "processing":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "failed":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  }

  return (
    <div dir="rtl" className="max-w-5xl mx-auto mt-8">
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">آرشیو گزارش‌ها</h2>
            <p className="text-sm text-gray-500 mt-1">
              اینجا همه گزارش‌های قبلی را می‌بینی؛ چیزی پاک نشده، فقط حالا مرتب و شیک نمایش داده می‌شود 😎
            </p>
          </div>

          <button
            onClick={fetchReports}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            بروزرسانی
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">در حال بارگذاری آرشیو...</div>
        ) : error ? (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        ) : reports.length === 0 ? (
          <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-4">
            هنوز گزارشی ثبت نشده.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="border border-gray-200 rounded-xl p-4 bg-gray-50"
              >
                <div className="flex flex-col md:flex-row gap-4">
                  {report.image_url && (
                    <div className="md:w-52 shrink-0">
                      <img
                        src={report.image_url}
                        alt={report.title || "report-image"}
                        className="w-full h-40 object-cover rounded-lg border border-gray-200"
                      />
                    </div>
                  )}

                  <div className="flex-1 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {report.title || "بدون عنوان"}
                      </h3>

                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs border w-fit ${getStatusClass(
                          report.status
                        )}`}
                      >
                        {getStatusLabel(report.status)}
                      </span>
                    </div>

                    <div className="text-xs text-gray-500">
                      تاریخ ثبت:{" "}
                      {new Date(report.created_at).toLocaleString("fa-IR")}
                    </div>

                    {report.description && (
                      <div className="text-sm text-gray-700 leading-7">
                        <span className="font-semibold">توضیحات:</span>{" "}
                        {report.description}
                      </div>
                    )}

                    <details className="bg-white border border-gray-200 rounded-lg p-3">
                      <summary className="cursor-pointer font-semibold text-sm text-gray-800">
                        مشاهده تحلیل هوش مصنوعی
                      </summary>

                      <div className="mt-3 text-sm text-gray-800 whitespace-pre-line leading-7">
                        {report.ai_analysis || "هنوز تحلیلی برای این گزارش ثبت نشده."}
                      </div>
                    </details>

                    <div className="text-[11px] text-gray-400 break-all">
                      ID: {report.id}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
