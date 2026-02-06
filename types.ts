
export type ReportType = 'Accidente Pesado' | 'Obras' | 'Tráfico Lento' | 'Clima';
export type ReportStatus = 'activo' | 'despejado';
export type VoteType = 'sigue' | 'despejado';

export interface Report {
  id: string;
  created_at: string;
  tipo: ReportType;
  descripcion: string;
  foto_url?: string;
  video_url?: string;
  latitud: number;
  longitud: number;
  estatus: ReportStatus;
  validaciones_count?: {
    sigue: number;
    despejado: number;
  };
}

export interface Validation {
  id: string;
  reporte_id: string;
  voto: VoteType;
  usuario_id: string;
}
