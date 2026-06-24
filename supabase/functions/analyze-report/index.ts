import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-1.5-flash",
];

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}

async function callGeminiWithFallback(params: {
  apiKey: string;
  base64Image: string;
  mimeType: string;
}) {
  const { apiKey, base64Image, mimeType } = params;

  const prompt = `تو یک مهندس ناظر و تحلیل‌گر کارگاه ساختمانی هستی.
این تصویر گزارش کارگاهی را بررسی کن و خروجی را به فارسی و کاربردی بده.

لطفاً این موارد را تحلیل کن:
1. وضعیت کلی تصویر
2. نکات ایمنی احتمالی
3. میزان پیشرفت یا نوع فعالیت قابل مشاهده
4. مشکلات یا ریسک‌های احتمالی
5. پیشنهاد اجرایی کوتاه برای مسئول کارگاه

جواب را خلاصه، واضح و حرفه‌ای بنویس.`;

  let lastErrorText = "";

  for (const model of GEMINI_MODELS) {
    console.log(`🤖 Trying Gemini model: ${model}`);

    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 1024,
        },
      }),
    });

    const rawText = await response.text();

    console.log(`📡 Gemini model ${model} status:`, response.status);

    if (!response.ok) {
      console.error(`❌ Gemini model ${model} error body:`, rawText);
      lastErrorText = `model=${model}, status=${response.status}, body=${rawText}`;

      if (response.status === 404) {
        continue;
      }

      if (response.status === 400 || response.status === 401 || response.status === 403) {
        throw new Error(
          `خطا از Gemini دریافت شد. احتمالاً GEMINI_API_KEY اشتباه است یا دسترسی ندارد. ${lastErrorText}`,
        );
      }

      continue;
    }

    let data: any;

    try {
      data = JSON.parse(rawText);
    } catch (_error) {
      console.error("❌ Gemini JSON parse error:", rawText);
      throw new Error("پاسخ Gemini قابل تبدیل به JSON نبود.");
    }

    const analysis =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "تحلیل هوش مصنوعی انجام شد، اما متن قابل خواندن از پاسخ Gemini دریافت نشد.";

    console.log(`✅ Gemini success with model: ${model}`);

    return {
      model,
      analysis,
      raw: data,
    };
  }

  throw new Error(
    `هیچ‌کدام از مدل‌های Gemini جواب ندادند. آخرین خطا: ${lastErrorText}`,
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
      status: 200,
    });
  }

  try {
    console.log("🚀 analyze-report function started");

    const body = await req.json();
    console.log("📦 Request body:", JSON.stringify(body));

    const { imageUrl, reportId } = body;

    if (!imageUrl) {
      throw new Error("imageUrl ارسال نشده است.");
    }

    if (!reportId) {
      throw new Error("reportId ارسال نشده است.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    console.log("🔑 Checking environment variables...");

    if (!supabaseUrl) {
      throw new Error("SUPABASE_URL در Secrets تنظیم نشده است.");
    }

    if (!supabaseServiceRoleKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY در Secrets تنظیم نشده است.");
    }

    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY در Secrets تنظیم نشده است.");
    }

    if (!geminiApiKey.startsWith("AIza")) {
      console.warn(
        "⚠️ هشدار: کلید Gemini معمولاً با AIza شروع می‌شود. کلید فعلی شاید کلید Gemini نباشد.",
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log("🖼️ Downloading image from:", imageUrl);

    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      const imageErrorText = await imageResponse.text();
      console.error("❌ Image download failed:", imageResponse.status, imageErrorText);
      throw new Error(`دانلود تصویر ناموفق بود. status=${imageResponse.status}`);
    }

    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
    console.log("🧾 Image content-type:", contentType);

    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const base64Image = arrayBufferToBase64(imageArrayBuffer);

    console.log("🤖 Sending image to Gemini with fallback models...");

    const geminiResult = await callGeminiWithFallback({
      apiKey: geminiApiKey,
      base64Image,
      mimeType: contentType,
    });

    const analysis = geminiResult.analysis;

    console.log("📝 Analysis:", analysis);
    console.log("🧠 Used Gemini model:", geminiResult.model);

    console.log("💾 Updating report in database:", reportId);

    const { data: updatedReport, error: updateError } = await supabase
      .from("reports")
      .update({
        ai_analysis: analysis,
        status: "completed",
      })
      .eq("id", reportId)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Database update error:", updateError);
      throw new Error(`خطا در آپدیت دیتابیس: ${updateError.message}`);
    }

    console.log("✅ Report updated successfully:", JSON.stringify(updatedReport));

    return new Response(
      JSON.stringify({
        success: true,
        message: "تحلیل با موفقیت انجام شد.",
        usedModel: geminiResult.model,
        analysis,
        report: updatedReport,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("❌ خطای واقعی:", error?.message || error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || "خطای نامشخص در اجرای فانکشن",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 400,
      },
    );
  }
});
