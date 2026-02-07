
export type ReportType = 
  | 'Libre'
  | 'Tráfico Lento' | 'Tráfico Pesado' | 'Alto Total' 
  | 'Accidente' | 'Obras' 
  | 'Policía Visible' | 'Policía Escondido' | 'Policía Contrario'
  | 'Vehículo en Vía' | 'Vehículo en Lateral' | 'Clima';

export type ReportStatus = 'activo' | 'despejado';
export type VoteType = 'sigue' | 'despejado';

export interface Report {
  id: string;
  created_at: string;
  tipo: ReportType;
  descripcion: string;
  fotos?: string[];
  latitud: number;
  longitud: number;
  estatus: ReportStatus;
  votos_sigue: number;
  votos_despejado: number;
  es_admin?: boolean;
  fuente?: string;
}

export interface ChatMessage {
  id: string;
  created_at: string;
  usuario_id: string;
  contenido: string;
}

export interface Validation {
  id: string;
  reporte_id: string;
  voto: VoteType;
  usuario_id: string;
}