
import React from 'react';
import { Report } from '../types';
import ReportCard from './ReportCard';
import { CheckCircle } from 'lucide-react';

interface ReportListProps {
  reports: Report[];
  loading: boolean;
  onReportClick: (lat: number, lng: number) => void;
}

const ReportList: React.FC<ReportListProps> = ({ reports, loading, onReportClick }) => {
  if (loading && reports.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-black text-[10px] tracking-widest uppercase">Buscando reportes...</p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="bg-emerald-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
          <CheckCircle className="text-emerald-500" size={32} />
        </div>
        <h3 className="text-white font-black text-lg">TODO DESPEJADO</h3>
        <p className="text-slate-400 text-xs mt-2 font-bold uppercase tracking-tighter">No hay incidentes registrados.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-4 sticky top-0 bg-slate-900/10 backdrop-blur-sm py-2 z-10">
        <h2 className="text-white font-black tracking-tighter text-[10px] uppercase flex items-center gap-2">
          <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
          Historial Reciente
        </h2>
        <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full font-black">
          {reports.length} REGISTROS
        </span>
      </div>
      <div className="pb-28">
        {reports.map((report) => (
          <ReportCard 
            key={report.id} 
            report={report} 
            onClick={onReportClick}
          />
        ))}
      </div>
    </div>
  );
};

export default ReportList;
