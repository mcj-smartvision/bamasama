"use client";

import { useState } from "react";
// اینجا یک نقطه اضافه کردیم تا از پوشه app بیایم بیرون و بریم سراغ components
import ReportForm from "../components/ReportForm";
import ReportsArchive from "../components/ReportsArchive";

export default function HomePage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <main dir="rtl" className="min-h-screen bg-gray-50 py-10 px-4">
      {/* هدر سایت */}
      <div className="max-w-5xl mx-auto mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          سامانه <span className="text-blue-600">باماسما</span>
        </h1>
        <p className="text-gray-500 mt-3 text-lg">
          مدیریت هوشمند و آرشیو گزارش‌های تصویری کارگاه
        </p>
      </div>

      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* بخش اول: فرم آپلود (همین‌جا عکس جدید بفرست) */}
        <section id="upload-section">
          <ReportForm onReportCreated={() => setRefreshKey((prev) => prev + 1)} />
        </section>

        <hr className="border-gray-200" />

        {/* بخش دوم: آرشیو گزارش‌ها */}
        <section id="archive-section">
          <ReportsArchive refreshKey={refreshKey} />
        </section>
        
      </div>
    </main>
  );
}
