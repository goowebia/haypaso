
import React from 'react';
import { Report } from '../types';
import ReportCard from './ReportCard';
import { CheckCircle, Loader2 } from 'lucide-react';

interface ReportListProps {
  reports: Report[];
  loading: boolean;
  onReportClick: (lat: number, lng: number) => void;
  onPhotoClick: (urls: string[]) => void;
}

const ReportList: React.FC<ReportListProps> = ({ reports, loading, onReportClick, onPhotoClick }) => {
  if (loading && reports.length === 0) {
    return (
      <div className="p-12 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-yellow-400 mb-4" size={32} />
        <p className="text-slate-500 font-black text-[10px] tracking-widest uppercase">Actualizando tráfico...</p>
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
        <p className="text-slate-400 text-[10px] mt-2 font-bold uppercase tracking-widest">Disfruta tu viaje, no hay incidentes.</p>
      </div>
    );
  }

  return (
    <div className="px-2 pt-1 pb-32">
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-white font-black tracking-tighter text-[10px] uppercase flex items-center gap-2">
          <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
          Incidentes en Ruta
        </h2>
        <span className="bg-slate-800 text-slate-400 text-[9px] px-2 py-0.5 rounded-full font-black">
          ÚLTIMAS 24 HORAS
        </span>
      </div>
      <div className="space-y-1">
        {reports.map((report) => (
          <ReportCard 
            key={report.id} 
            report={report} 
            onClick={onReportClick}
            onPhotoClick={onPhotoClick}
          />
        ))}
      </div>
    </div>
  );
};

export default ReportList;
