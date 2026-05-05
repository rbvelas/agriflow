'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getUsuario } from '@/lib/auth';
import { useLote } from '@/components/providers/LoteProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { 
  Sprout, 
  Plus, 
  MapPin, 
  Layers, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  Calendar,
  Thermometer,
  Info,
  MoreVertical,
  Edit,
  ArrowRight,
  Maximize2
} from 'lucide-react';

// ─── tipos locales ────────────────────────────────────────────────
interface Lote {
  id: string; nombre: string; hectareas: number; tipo_suelo: string;
  activo: boolean; temporadas?: any[];
}
interface Finca {
  id: string; nombre: string; departamento: string; municipio: string;
  hectareas_total: number; lotes?: Lote[];
}
interface Cultivo {
  id: string; nombre: string; nombre_cientifico: string; dias_ciclo: number;
  rendimiento_potencial_kg_ha: number;
}

// ─── formulario vacío ─────────────────────────────────────────────
const FINCA_VACIA = { nombre:'', departamento:'', municipio:'', hectareas_total:'', latitud:'', longitud:'' };
const LOTE_VACIO  = { nombre:'', hectareas:'', tipo_suelo:'Franco arenoso', latitud_centroide:'', longitud_centroide:'' };
const TEMP_VACIA  = { cultivoId:'', fecha_siembra:'', fecha_cosecha_estimada:'' };

const TIPOS_SUELO = [
  'Franco arenoso','Franco arcilloso','Franco limoso',
  'Arenoso','Arcilloso','Limoso','Franco',
];

const ESTADO_COLORS: Record<string, string> = {
  activa:      'bg-emerald-50 text-emerald-700 border-emerald-100',
  planificada: 'bg-blue-50 text-blue-700 border-blue-100',
  cosechada:   'bg-amber-50 text-amber-700 border-amber-100',
  cancelada:   'bg-red-50 text-red-700 border-red-100',
};

// ─── componentes auxiliares ───────────────────────────────────────
const Campo = ({
  label, value, onChange, type = 'text', placeholder = '', required = false,
}: any) => (
  <div className="space-y-1.5">
    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3
                 text-slate-900 text-sm placeholder-slate-400 focus:outline-none
                 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50
                 transition-all shadow-sm"
    />
  </div>
);

export default function FincasPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { setLoteSeleccionado } = useLote();
  const usuario = getUsuario();

  // ── estado ────────────────────────────────────────────────────
  const [fincas,       setFincas]       = useState<Finca[]>([]);
  const [cultivos,     setCultivos]     = useState<Cultivo[]>([]);
  const [expandida,    setExpandida]    = useState<string | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [guardando,    setGuardando]    = useState(false);

  // modales
  const [modalFinca,    setModalFinca]    = useState(false);
  const [modalLote,     setModalLote]     = useState(false);
  const [modalTemporada,setModalTemporada]= useState(false);
  const [editandoFinca, setEditandoFinca] = useState<Finca | null>(null);
  const [fincaParaLote, setFincaParaLote] = useState<string>('');
  const [loteParaTemp,  setLoteParaTemp]  = useState<string>('');

  // formularios
  const [formFinca, setFormFinca] = useState(FINCA_VACIA);
  const [formLote,  setFormLote]  = useState(LOTE_VACIO);
  const [formTemp,  setFormTemp]  = useState(TEMP_VACIA);

  // confirmación
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant: 'danger' | 'success' | 'info';
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
    variant: 'info',
  });

  // ── carga inicial ──────────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [fRes, cRes] = await Promise.all([
        api.getFincas(),
        api.getCultivos(),
      ]);
      setFincas(fRes.data);
      setCultivos(cRes.data);
      if (fRes.data.length > 0) setExpandida(fRes.data[0].id);
    } catch (err: any) {
      toast({ title: '❌ Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // ── crear finca ────────────────────────────────────────────────
  const handleCrearFinca = async () => {
    if (!formFinca.nombre.trim() || !formFinca.hectareas_total) {
      toast({ title: '⚠️ Datos incompletos', description: 'Nombre y hectáreas son obligatorios.', variant: 'destructive' });
      return;
    }
    setGuardando(true);
    try {
      await api.crearFinca({
        nombre:         formFinca.nombre,
        departamento:   formFinca.departamento,
        municipio:      formFinca.municipio,
        hectareas_total:parseFloat(formFinca.hectareas_total),
        latitud:        formFinca.latitud  ? parseFloat(formFinca.latitud)  : undefined,
        longitud:       formFinca.longitud ? parseFloat(formFinca.longitud) : undefined,
        propietarioId:  usuario?.id ?? '22222222-0000-0000-0000-000000000001',
      });
      toast({ title: '✅ Finca creada', description: `"${formFinca.nombre}" agregada correctamente.` });
      setModalFinca(false);
      setFormFinca(FINCA_VACIA);
      cargarDatos();
    } catch (err: any) {
      toast({ title: '❌ Error', description: err.message, variant: 'destructive' });
    } finally {
      setGuardando(false);
    }
  };

  // ── crear lote ────────────────────────────────────────────────
  const handleCrearLote = async () => {
    if (!formLote.nombre.trim() || !formLote.hectareas) {
      toast({ title: '⚠️ Datos incompletos', description: 'Nombre y área son obligatorios.', variant: 'destructive' });
      return;
    }
    setGuardando(true);
    try {
      await api.crearLote({
        fincaId:            fincaParaLote,
        nombre:             formLote.nombre,
        hectareas:          parseFloat(formLote.hectareas),
        tipo_suelo:         formLote.tipo_suelo,
        latitud_centroide:  formLote.latitud_centroide  ? parseFloat(formLote.latitud_centroide)  : undefined,
        longitud_centroide: formLote.longitud_centroide ? parseFloat(formLote.longitud_centroide) : undefined,
      });
      toast({ title: '✅ Lote creado', description: `"${formLote.nombre}" agregado correctamente.` });
      setModalLote(false);
      setFormLote(LOTE_VACIO);
      cargarDatos();
    } catch (err: any) {
      toast({ title: '❌ Error', description: err.message, variant: 'destructive' });
    } finally {
      setGuardando(false);
    }
  };

  // ── crear temporada ───────────────────────────────────────────
  const handleCrearTemporada = async () => {
    if (!formTemp.cultivoId || !formTemp.fecha_siembra) {
      toast({ title: '⚠️ Datos incompletos', description: 'Cultivo y fecha de siembra son obligatorios.', variant: 'destructive' });
      return;
    }
    setGuardando(true);
    try {
      await api.crearTemporada({
        loteId:               loteParaTemp,
        cultivoId:            formTemp.cultivoId,
        fecha_siembra:        formTemp.fecha_siembra,
        fecha_cosecha_estimada: formTemp.fecha_cosecha_estimada || undefined,
      });
      toast({ title: '✅ Temporada iniciada', description: 'La temporada fue registrada exitosamente.' });
      setModalTemporada(false);
      setFormTemp(TEMP_VACIA);
      cargarDatos();
    } catch (err: any) {
      toast({ title: '❌ Error', description: err.message, variant: 'destructive' });
    } finally {
      setGuardando(false);
    }
  };

  // ── eliminar finca ────────────────────────────────────────────
  const handleEliminarFinca = (id: string, nombre: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Finca',
      description: `¿Está seguro de eliminar la finca "${nombre}"? Esta acción no se puede deshacer y se perderán todos los datos asociados.`,
      variant: 'danger',
      confirmText: 'Eliminar Finca',
      onConfirm: async () => {
        try {
          await api.eliminarFinca(id);
          toast({ title: '🗑️ Finca eliminada' });
          cargarDatos();
        } catch (err: any) {
          toast({ title: '❌ Error', description: err.message, variant: 'destructive' });
        }
      }
    });
  };

  // ── render ─────────────────────────────────────────────────────
  const esSoloLectura = usuario?.roles?.includes('tecnico');

  return (
    <>
      <div className="p-8 space-y-8 animate-fade-in max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">
              <Layers size={14} />
              <span>Infraestructura Agrícola</span>
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              Gestión de Fincas y Lotes
            </h1>
            <p className="text-slate-500 font-medium max-w-md">
              Administre sus propiedades agrícolas y subdivisiones de cultivo de manera profesional.
            </p>
          </div>
          {!esSoloLectura && (
            <Button
              onClick={() => { setModalFinca(true); setEditandoFinca(null); setFormFinca(FINCA_VACIA); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-6 rounded-2xl shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center gap-2"
            >
              <Plus size={20} />
              Nueva Finca
            </Button>
          )}
        </div>

        {/* ─── LISTA DE FINCAS ──────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-64 bg-white border border-slate-100 rounded-[2rem] animate-pulse" />
            ))}
          </div>
        ) : fincas.length === 0 ? (
          <Card className="bg-white border-slate-200 shadow-xl rounded-[2rem] overflow-hidden">
            <CardContent className="py-24 text-center flex flex-col items-center space-y-6">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                <Sprout size={48} />
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-slate-900">No tiene fincas registradas</p>
                <p className="text-slate-500 max-w-sm">
                  Comience por agregar su primera propiedad agrícola para gestionar sus lotes.
                </p>
              </div>
              {!esSoloLectura && (
                <Button
                  onClick={() => setModalFinca(true)}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-2xl px-8 py-6 font-bold"
                >
                  + Nueva Finca
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {fincas.map((finca) => (
              <div key={finca.id} className="group">
                <Card className={cn(
                  "bg-white border-slate-200 shadow-sm transition-all duration-300 rounded-[2rem] overflow-hidden",
                  expandida === finca.id ? "shadow-xl border-emerald-100 ring-4 ring-emerald-50/50" : "hover:shadow-md"
                )}>
                  {/* Cabecera de finca */}
                  <CardHeader className="p-0">
                    <div 
                      className="flex flex-col md:flex-row items-stretch cursor-pointer"
                      onClick={() => setExpandida(expandida === finca.id ? null : finca.id)}
                    >
                      {/* Visual de finca */}
                      <div className={cn(
                        "md:w-48 bg-slate-50 flex flex-col items-center justify-center p-8 transition-colors",
                        expandida === finca.id ? "bg-emerald-600 text-white" : "group-hover:bg-slate-100 text-slate-400"
                      )}>
                        <Sprout size={40} strokeWidth={1.5} />
                        <div className="mt-4 text-center">
                          <p className={cn(
                            "text-[10px] font-black uppercase tracking-[0.2em]",
                            expandida === finca.id ? "text-emerald-100" : "text-slate-400"
                          )}>Hectáreas</p>
                          <p className={cn(
                            "text-xl font-black",
                            expandida === finca.id ? "text-white" : "text-slate-900"
                          )}>{finca.hectareas_total}</p>
                        </div>
                      </div>

                      {/* Info de finca */}
                      <div className="flex-1 p-8 flex flex-col justify-center">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                               <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{finca.nombre}</h2>
                               <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                                 {finca.lotes?.length ?? 0} LOTES
                               </span>
                            </div>
                            <div className="flex items-center gap-4 text-slate-400">
                              <div className="flex items-center gap-1.5 text-sm font-medium">
                                <MapPin size={14} />
                                <span>{finca.departamento ?? '—'}, {finca.municipio ?? '—'}</span>
                              </div>
                            </div>
                          </div>

                          {!esSoloLectura && (
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFincaParaLote(finca.id);
                                  setFormLote(LOTE_VACIO);
                                  setModalLote(true);
                                }}
                                className="p-3 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm shadow-emerald-100/50"
                                title="Agregar Lote"
                              >
                                <Plus size={20} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEliminarFinca(finca.id, finca.nombre);
                                }}
                                className="p-3 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all"
                                title="Eliminar Finca"
                              >
                                <Trash2 size={20} />
                              </button>
                              <div className="p-3 rounded-xl text-slate-300">
                                {expandida === finca.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  {/* Contenido Expandido: Lotes */}
                  {expandida === finca.id && (
                    <CardContent className="p-8 pt-0 border-t border-slate-50 bg-slate-50/30">
                      <div className="py-6 flex items-center justify-between">
                         <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Detalle de Lotes</h3>
                         <div className="h-px bg-slate-100 flex-1 mx-6" />
                      </div>

                      {!finca.lotes || finca.lotes.length === 0 ? (
                        <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                          <Layers size={32} className="text-slate-200 mx-auto mb-4" />
                          <p className="text-sm font-bold text-slate-900">Esta finca no tiene lotes registrados</p>
                          <p className="text-xs text-slate-400 mt-1">Presione el botón "+" para comenzar a subdividir su propiedad.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                          {finca.lotes.map((lote) => {
                            const temporadaActiva = lote.temporadas?.find(
                              (t: any) => t.estado === 'activa',
                            );
                            return (
                              <div
                                key={lote.id}
                                className="group/lote bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all duration-300"
                              >
                                {/* Lote Header */}
                                <div className="flex items-start justify-between mb-6">
                                  <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover/lote:bg-emerald-50 group-hover/lote:text-emerald-600 transition-colors">
                                    <Layers size={22} />
                                  </div>
                                  <span className={cn(
                                    "text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest border",
                                    temporadaActiva
                                      ? ESTADO_COLORS['activa']
                                      : 'bg-slate-100 text-slate-500 border-slate-200'
                                  )}>
                                    {temporadaActiva ? 'EN PRODUCCIÓN' : 'DISPONIBLE'}
                                  </span>
                                </div>

                                <div className="space-y-1 mb-6">
                                  <h4 className="text-lg font-bold text-slate-900">{lote.nombre}</h4>
                                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                    <Maximize2 size={12} />
                                    <span>{lote.hectareas} Hectáreas de superficie</span>
                                  </div>
                                </div>

                                {/* Lote Stats */}
                                <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50 mb-6">
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Suelo</p>
                                    <p className="text-sm font-bold text-slate-700 capitalize">{lote.tipo_suelo ?? '—'}</p>
                                  </div>
                                  <div className="space-y-1 text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cultivo</p>
                                    <p className={cn(
                                      "text-sm font-bold truncate",
                                      temporadaActiva ? "text-emerald-600" : "text-slate-400"
                                    )}>
                                      {temporadaActiva ? temporadaActiva.cultivo?.nombre : 'Sin siembra'}
                                    </p>
                                  </div>
                                </div>

                                {/* Acciones del lote */}
                                <div className="flex gap-3">
                                  {!temporadaActiva ? (
                                    !esSoloLectura && (
                                      <Button
                                        onClick={() => {
                                          setLoteParaTemp(lote.id);
                                          setFormTemp(TEMP_VACIA);
                                          setModalTemporada(true);
                                        }}
                                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-5 rounded-2xl flex items-center justify-center gap-2"
                                      >
                                        <Sprout size={14} /> Iniciar Siembra
                                      </Button>
                                    )
                                  ) : (
                                    <div className="flex gap-2 w-full">
                                      <Button
                                        onClick={() => {
                                          setLoteSeleccionado({
                                            id: lote.id,
                                            nombre: lote.nombre,
                                            fincaId: finca.id,
                                            fincaNombre: finca.nombre
                                          });
                                          router.push('/dashboard');
                                        }}
                                        className="flex-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-100 text-xs font-bold py-5 rounded-2xl transition-all"
                                      >
                                        Dashboard
                                      </Button>
                                      <Button
                                        onClick={() => {
                                          setConfirmModal({
                                            isOpen: true,
                                            title: 'Registrar Cosecha',
                                            description: '¿Desea cerrar este ciclo de cultivo y registrar la cosecha? Esta acción marcará la temporada como finalizada.',
                                            variant: 'success',
                                            confirmText: 'Confirmar Cosecha',
                                            onConfirm: async () => {
                                              try {
                                                await api.cambiarEstadoTemporada(temporadaActiva.id, 'cosechada');
                                                toast({ title: '✅ Temporada cerrada' });
                                                cargarDatos();
                                              } catch (err: any) {
                                                toast({ title: '❌ Error', description: err.message, variant: 'destructive' });
                                              }
                                            }
                                          });
                                        }}
                                        variant="outline"
                                        className="border-slate-200 text-slate-400 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-100 py-5 rounded-2xl"
                                        title="Registrar Cosecha"
                                      >
                                        <ArrowRight size={16} />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              </div>
            ))}
          </div>
        )}

        {/* ─── CATÁLOGO DE CULTIVOS ─────────────────────────────────── */}
        <div className="pt-12 pb-24">
          <div className="flex items-center gap-3 mb-8">
             <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg">
                <Sprout size={20} />
             </div>
             <h2 className="text-xl font-bold text-slate-900">Catálogo de Cultivos Referencial</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cultivos.map((c) => (
              <Card key={c.id} className="bg-white border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900">{c.nombre}</h3>
                    <p className="text-[10px] text-slate-400 italic font-medium">{c.nombre_cientifico}</p>
                  </div>
                  <div className="bg-slate-50 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold">
                    {c.dias_ciclo} DÍAS
                  </div>
                </div>
                
                <div className="space-y-3 pt-4 border-t border-slate-50">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-medium">Rendimiento Potencial</span>
                    <span className="text-xs font-bold text-emerald-600">
                      {c.rendimiento_potencial_kg_ha ? `${Number(c.rendimiento_potencial_kg_ha).toLocaleString('es-PE')} kg/ha` : '—'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                     <div className="bg-slate-50 rounded-xl p-2 text-center">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Kc Inicial</p>
                        <p className="text-xs font-bold text-slate-700">{Number((c as any).kc_inicial).toFixed(2)}</p>
                     </div>
                     <div className="bg-slate-50 rounded-xl p-2 text-center">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Kc Medio</p>
                        <p className="text-xs font-bold text-slate-700">{Number((c as any).kc_medio).toFixed(2)}</p>
                     </div>
                     <div className="bg-slate-50 rounded-xl p-2 text-center">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Kc Final</p>
                        <p className="text-xs font-bold text-slate-700">{Number((c as any).kc_final).toFixed(2)}</p>
                     </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* ─── MODAL NUEVA / EDITAR FINCA ───────────────────────────── */}
      {modalFinca && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <Sprout size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {editandoFinca ? 'Editar Finca' : 'Nueva Finca'}
              </h2>
            </div>

            <div className="space-y-4">
              <Campo label="Nombre de la finca" value={formFinca.nombre}
                onChange={(v: string) => setFormFinca(p => ({ ...p, nombre: v }))}
                placeholder="Ej: Finca El Paraíso" required />
              
              <div className="grid grid-cols-2 gap-4">
                <Campo label="Departamento" value={formFinca.departamento}
                  onChange={(v: string) => setFormFinca(p => ({ ...p, departamento: v }))}
                  placeholder="La Libertad" />
                <Campo label="Municipio" value={formFinca.municipio}
                  onChange={(v: string) => setFormFinca(p => ({ ...p, municipio: v }))}
                  placeholder="Santiago de Cao" />
              </div>

              <Campo label="Hectáreas totales" value={formFinca.hectareas_total}
                type="number" required
                onChange={(v: string) => setFormFinca(p => ({ ...p, hectareas_total: v }))}
                placeholder="50.5" />

              <div className="grid grid-cols-2 gap-4 pt-2">
                <Campo label="Latitud" value={formFinca.latitud}
                  type="number"
                  onChange={(v: string) => setFormFinca(p => ({ ...p, latitud: v }))}
                  placeholder="-7.895" />
                <Campo label="Longitud" value={formFinca.longitud}
                  type="number"
                  onChange={(v: string) => setFormFinca(p => ({ ...p, longitud: v }))}
                  placeholder="-79.527" />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6 rounded-2xl shadow-lg shadow-emerald-100"
                onClick={handleCrearFinca}
                disabled={guardando}
              >
                {guardando ? 'Guardando...' : 'Guardar Finca'}
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 border-slate-200 text-slate-500 hover:bg-slate-50 py-6 rounded-2xl"
                onClick={() => setModalFinca(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL NUEVO LOTE ─────────────────────────────────────── */}
      {modalLote && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <Layers size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Nuevo Lote</h2>
            </div>

            <div className="space-y-4">
              <Campo label="Nombre del lote" value={formLote.nombre} required
                onChange={(v: string) => setFormLote(p => ({ ...p, nombre: v }))}
                placeholder="Ej: Lote Norte A" />
              
              <Campo label="Área (hectáreas)" value={formLote.hectareas} type="number" required
                onChange={(v: string) => setFormLote(p => ({ ...p, hectareas: v }))}
                placeholder="12.3" />

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Tipo de suelo</label>
                <select
                  value={formLote.tipo_suelo}
                  onChange={(e) => setFormLote(p => ({ ...p, tipo_suelo: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3
                             text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20
                             appearance-none cursor-pointer hover:border-emerald-500/50 transition-all shadow-sm"
                >
                  {TIPOS_SUELO.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <Campo label="Latitud" value={formLote.latitud_centroide} type="number"
                  onChange={(v: string) => setFormLote(p => ({ ...p, latitud_centroide: v }))}
                  placeholder="-7.890" />
                <Campo label="Longitud" value={formLote.longitud_centroide} type="number"
                  onChange={(v: string) => setFormLote(p => ({ ...p, longitud_centroide: v }))}
                  placeholder="-79.525" />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 rounded-2xl shadow-lg shadow-blue-100"
                onClick={handleCrearLote}
                disabled={guardando}
              >
                {guardando ? 'Guardando...' : 'Crear Lote'}
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 border-slate-200 text-slate-500 hover:bg-slate-50 py-6 rounded-2xl"
                onClick={() => setModalLote(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL INICIAR TEMPORADA ──────────────────────────────── */}
      {modalTemporada && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-10 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <Sprout size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Iniciar Nueva Temporada</h2>
            </div>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              Configure el ciclo de cultivo para este lote. Esto activará las predicciones de IA y las recomendaciones de riego FAO-56 automáticamente.
            </p>
            
            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-widest ml-1">
                  ¿Qué va a sembrar? <span className="text-red-500">*</span>
                </label>
                <select
                  value={formTemp.cultivoId}
                  onChange={(e) => setFormTemp({ ...formTemp, cultivoId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4
                             text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                >
                  <option value="">Seleccione un cultivo...</option>
                  {cultivos.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre} ({c.nombre_cientifico})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-widest ml-1">
                    Fecha de Siembra <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formTemp.fecha_siembra}
                    onChange={(e) => setFormTemp({ ...formTemp, fecha_siembra: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4
                               text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-widest ml-1">
                    Cosecha Estimada
                  </label>
                  <input
                    type="date"
                    value={formTemp.fecha_cosecha_estimada}
                    onChange={(e) => setFormTemp({ ...formTemp, fecha_cosecha_estimada: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4
                               text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 flex gap-4">
                 <div className="text-emerald-600 shrink-0">
                    <Info size={20} />
                 </div>
                 <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                   Al iniciar la temporada, nuestro motor de IA comenzará a procesar datos satelitales y de sensores para generar su primera predicción de rendimiento en 24 horas.
                 </p>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  disabled={guardando}
                  onClick={handleCrearTemporada}
                  className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-7 rounded-2xl shadow-lg shadow-emerald-100 transition-all active:scale-95"
                >
                  {guardando ? 'Iniciando...' : '🚀 Iniciar Ciclo de Cultivo'}
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 border-slate-200 text-slate-400 hover:bg-slate-50 py-7 rounded-2xl"
                  onClick={() => setModalTemporada(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        description={confirmModal.description}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(p => ({ ...p, isOpen: false }))}
      />
    </>
  );
}