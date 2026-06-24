"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/modules/database/supabase";

type ReportFormProps = {
  onReportCreated?: () => void;
};

export default function ReportForm({ onReportCreated }: ReportFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [analysis, setAnalysis] = useState("");

  const resultRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (analysis && resultRef.current) {
      resultRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [analysis]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setMessage("");

      if (!imageFile) {
        setMessage("لطفاً یک تصویر انتخاب کن.");
        return;
      }

      const fileExt = imageFile.name.split(".").pop() || "jpg";
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;

      // چون bucket اسمش reports هست، دیگه لازم نیست دوباره reports/ بذاریم
      const filePath = fileName;

      // 1) آپلود فایل در Storage
      const { error: uploadError } = await supabase.storage
        .from("reports")
        .upload(filePath, imageFile);

      if (uploadError) {
        throw new Error(`خطا در آپلود تصویر: ${uploadError.message}`);
      }

      // 2) گرفتن لینک عمومی
      const { data: publicUrlData } = supabase.storage
        .from("reports")
        .getPublicUrl(filePath);

      const imageUrl = publicUrlData.publicUrl;

      // 3) ساخت رکورد اولیه در دیتابیس
      const { data: report, error: reportError } = await supabase
        .from("reports")
        .insert({
          title: title || "گزارش جدید",
          description: description || "",
          image_url: imageUrl,
          status: "processing",
        })
        .select("id")
        .single();

      if (reportError) {
        throw new Error(`خطا در ثبت گزارش: ${reportError.message}`);
      }

      // 4) اجرای Edge Function
      const { error: functionError } = await supabase.functions.invoke(
        "analyze-report",
        {
          body: {
            imageUrl,
            reportId: report.id,
          },
        }
      );

      if (functionError) {
        await supabase
          .from("reports")
          .update({ status: "failed" })
          .eq("id", report.id);

        throw new Error(`خطا در تحلیل هوش مصنوعی: ${functionError.message}`);
      }

      // 5) دریافت نتیجه نهایی
      const { data: updatedReport, error: fetchError } = await supabase
        .from("reports")
        .select("ai_analysis, status")
        .eq("id", report.id)
        .single();

      if (fetchError) {
        throw new Error(`خطا در دریافت نتیجه تحلیل: ${fetchError.message}`);
      }

      setMessage("✅ گزارش با موفقیت ثبت و تحلیل شد.");
      setAnalysis(updatedReport?.ai_analysis || "تحلیلی ثبت نشده است.");

      // فرم خالی شود
      setTitle("");
      setDescription("");
      setImageFile(null);

      // به بخش آرشیو خبر بده که دوباره لود کند
      onReportCreated?.();
    } catch (error: any) {
      console.error("❌ Error:", error);
      setMessage(error.message || "خطایی رخ داد.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-gray-900">ثبت گزارش جدید</h2>
          <p className="text-sm text-gray-500">
            تصویر را ارسال کن، نتیجه تحلیل هم اینجا می‌آید هم در آرشیو ذخیره می‌شود.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="عنوان گزارش"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
          />

          <textarea
            placeholder="توضیحات گزارش"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-blue-500 min-h-28"
          />

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="w-full text-sm"
          />

          {imageFile && (
            <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-2">
              فایل انتخاب‌شده: {imageFile.name}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg disabled:bg-gray-400 transition-colors"
          >
            {loading ? "در حال ارسال و تحلیل..." : "ارسال گزارش"}
          </button>
        </form>

        {message && (
          <div className="text-sm p-3 bg-gray-50 rounded-lg border border-gray-200 text-gray-700">
            {message}
          </div>
        )}

        {analysis && (
          <div
            ref={resultRef}
            className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl shadow-sm"
          >
            <h3 className="font-bold mb-3 text-green-800">
              نتیجه آخرین تحلیل هوش مصنوعی
            </h3>
            <p className="whitespace-pre-line text-sm leading-7 text-gray-800">
              {analysis}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
