'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// فرض بر این است که متغیرهای محیطی در فایل .env.local شما تنظیم شده‌اند
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ReportForm({ reportId }: { reportId: string }) {
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!imageUrl) return alert("لطفاً لینک عکس رو وارد کن!");
    
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('analyze-report', {
        body: { imageUrl, reportId },
      });

      if (error) throw error;
      alert("تحلیل با موفقیت انجام شد! صفحه رو رفرش کن.");
    } catch (err: any) {
      alert("خطا در تحلیل: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded shadow-md bg-white">
      <h3 className="font-bold mb-2">تحلیل هوش مصنوعی</h3>
      <input 
        type="text" 
        value={imageUrl} 
        onChange={(e) => setImageUrl(e.target.value)} 
        placeholder="لینک عکس را اینجا کپی کن"
        className="border p-2 w-full mb-2 rounded"
      />
      <button 
        onClick={handleAnalyze} 
        disabled={loading}
        className="bg-blue-600 text-white p-2 rounded w-full hover:bg-blue-700"
      >
        {loading ? 'در حال تحلیل...' : 'شروع تحلیل'}
      </button>
    </div>
  );
}
