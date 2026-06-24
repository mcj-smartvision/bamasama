import ReportForm from '@/components/ReportForm';
import { supabase } from '@/modules/database/supabase';

export default async function Home() {
  const { data: reports } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 dir-rtl" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* هدر سایت */}
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2">سامانه باما‌سما</h1>
          <p className="text-slate-500">مدیریت و هوشمندسازی گزارش‌های کارگاهی</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
          {/* ستون فرم */}
          <ReportForm />

          {/* ستون لیست گزارش‌ها */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              📑 سوابق گزارش‌ها
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {reports?.map((report) => (
                <div key={report.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                  {report.image_url && (
                    <img src={report.image_url} alt={report.title} className="w-full h-48 object-cover" />
                  )}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-slate-800">{report.title}</h3>
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {new Date(report.created_at).toLocaleDateString('fa-IR')}
                      </span>
                    </div>
                    <p className="text-slate-600 text-sm line-clamp-3 mb-4">{report.description}</p>
                    <div className="flex items-center gap-2 border-t pt-3">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                      <span className="text-xs text-slate-400 font-medium italic">در انتظار تحلیل هوش مصنوعی...</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {(!reports || reports.length === 0) && (
              <div className="text-center p-12 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
                هنوز هیچ گزارشی ثبت نشده است. اولین گزارش را ثبت کنید!
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
