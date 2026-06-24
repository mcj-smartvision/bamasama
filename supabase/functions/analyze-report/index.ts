import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ۱. دریافت اطلاعات از درخواست
    const { imageUrl, reportId } = await req.json()
    
    if (!imageUrl || !reportId) {
      throw new Error("imageUrl یا reportId ارسال نشده است");
    }

    // ۲. اتصال به دیتابیس
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ۳. دانلود تصویر و تبدیل به Base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`دانلود تصویر ناموفق بود: status ${imageResponse.status}`);
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64Image = btoa(
      uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // ۴. درخواست به Gemini
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY تنظیم نشده است");
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { 
                text: 'تو یک مهندس ناظر خبره ساختمانی هستی. تصویر ارسالی از کارگاه را با دقت تحلیل کن و نکات فنی، ایمنی و پیشرفت کار را به زبان فارسی و تخصصی گزارش بده.' 
              },
              { 
                inline_data: { 
                  mime_type: "image/jpeg", 
                  data: base64Image
                } 
              }
            ]
          }]
        }),
      }
    );

    const aiData = await geminiRes.json();

    if (!geminiRes.ok) {
      // اگر خود Gemini خطای ساختاری داده
      throw new Error(
        `خطا از سمت Gemini: status ${geminiRes.status}, body: ${JSON.stringify(aiData)}`
      );
    }

    if (!aiData.candidates || aiData.candidates.length === 0) {
      throw new Error("پاسخ هوش مصنوعی خالی بود: " + JSON.stringify(aiData));
    }

    // ایمن گرفتن متن
    const firstCandidate = aiData.candidates[0];
    const firstPartText =
      firstCandidate?.content?.parts?.[0]?.text ??
      firstCandidate?.content?.parts?.map((p: any) => p.text).join('\n');

    if (!firstPartText) {
      throw new Error(
        "ساختار پاسخ Gemini مطابق انتظار نیست: " + JSON.stringify(aiData)
      );
    }

    const analysis = firstPartText;

    // ۵. آپدیت دیتابیس
    const { error: updateError } = await supabaseClient
      .from('reports')
      .update({ 
        analysis,
        status: 'completed' 
      })
      .eq('id', reportId);

    if (updateError) {
      throw new Error("خطا در آپدیت جدول reports: " + updateError.message);
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('analyze-report error:', error);

    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
