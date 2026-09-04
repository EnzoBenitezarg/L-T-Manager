'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import styles from './configuracion.module.css';
import { MODULOS_FIJOS } from '@/lib/navegacion';
import EquipoPanel from '@/components/negocio/EquipoPanel';

const RUBRO_DESC = {
  BARBERIA: 'Peluquería y arreglo de barba',
  ESTETICA: 'Manicuría, depilación y belleza',
  GIMNASIO: 'Entrenamiento y suplementos',
  COMERCIO: 'Venta de productos y atención',
  ALMACEN: 'Despensa y artículos varios',
};

const DIAS_EDIT = [
  { label: 'Lunes', dia: 1 },
  { label: 'Martes', dia: 2 },
  { label: 'Miércoles', dia: 3 },
  { label: 'Jueves', dia: 4 },
  { label: 'Viernes', dia: 5 },
  { label: 'Sábado', dia: 6 },
  { label: 'Domingo', dia: 0 },
];

export default function ConfiguracionPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [nombre, setNombre] = useState('');
  const [rubro, setRubro] = useState('BARBERIA');
  const [modulos, setModulos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [horarios, setHorarios] = useState(null);
  const [horariosLoading, setHorariosLoading] = useState(true);
  const [horariosSaving, setHorariosSaving] = useState(false);
  const [horariosMsg, setHorariosMsg] = useState('');
  const [horariosError, setHorariosError] = useState('');
  const [tab, setTab] = useState('negocio');

  const TABS = [
    { key: 'negocio', label: 'Negocio', icon: '🏪' },
    { key: 'horarios', label: 'Horarios', icon: '🕘' },
    { key: 'equipo', label: 'Equipo', icon: '👥' },
    { key: 'secciones', label: 'Secciones', icon: '🧩' },
    { key: 'datos', label: 'Datos', icon: '💾' },
  ];

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/negocios/activo');
    const d = await res.json();
    if (res.ok) {
      setData(d);
      setNombre(d.negocio.nombre);
      setRubro(d.negocio.rubro);
      setModulos(d.negocio.modulos || []);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    fetch('/api/horarios')
      .then((r) => r.json())
      .then((rows) => {
        if (!Array.isArray(rows)) return;
        setHorarios(
          DIAS_EDIT.map((d) => {
            const encontrado = rows.find((h) => h.diaSemana === d.dia);
            return encontrado
              ? {
                  diaSemana: d.dia,
                  abierto: encontrado.abierto,
                  apertura: encontrado.apertura || '09:00',
                  cierre: encontrado.cierre || '20:00',
                }
              : { diaSemana: d.dia, abierto: true, apertura: '09:00', cierre: '20:00' };
          })
        );
      })
      .finally(() => setHorariosLoading(false));
  }, []);

  function setHorario(dia, nuevo) {
    setHorarios((prev) => (prev || []).map((h) => (h.diaSemana === dia ? nuevo : h)));
  }

  function toggleModulo(key) {
    setModulos((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function saveHorarios() {
    if (!horarios) return;
    const editable = horarios.filter((h) => h.abierto);
    const invalido = editable.find((h) => !h.apertura || !h.cierre || h.cierre <= h.apertura);
    if (invalido) {
      const d = DIAS_EDIT.find((x) => x.dia === invalido.diaSemana);
      setHorariosError(`Revisá el horario de ${d?.label || 'ese día'}`);
      return;
    }
    setHorariosSaving(true);
    setHorariosMsg('');
    setHorariosError('');
    try {
      const res = await fetch('/api/horarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(horarios),
      });
      if (!res.ok) {
        const d = await res.json();
        setHorariosError(d.error || 'No se pudo guardar los horarios');
        setHorariosSaving(false);
        return;
      }
      setHorariosMsg('✅ Horarios guardados');
      setHorariosSaving(false);
      setTimeout(() => setHorariosMsg(''), 2500);
    } catch {
      setHorariosError('Error de conexión');
      setHorariosSaving(false);
    }
  }

  async function limpiarHorarios() {
    if (!confirm('¿Quitar todos los horarios? El negocio quedará marcado como abierto todo el día.')) return;
    setHorariosSaving(true);
    setHorariosMsg('');
    setHorariosError('');
    try {
      await fetch('/api/horarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([]),
      });
      setHorarios(DIAS_EDIT.map((d) => ({ diaSemana: d.dia, abierto: true, apertura: '09:00', cierre: '20:00' })));
      setHorariosMsg('✅ Horarios quitados (abierto todo el día)');
      setHorariosSaving(false);
      setTimeout(() => setHorariosMsg(''), 3000);
    } catch {
      setHorariosError('Error de conexión');
      setHorariosSaving(false);
    }
  }

  async function guardarCambios() {
    setSaving(true);
    setMsg('');
    setError('');
    try {
      const res = await fetch(`/api/negocios/${data.negocio.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, rubro, modulos }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'No se pudo guardar');
        setSaving(false);
        return;
      }
      setMsg('Cambios guardados');
      setSaving(false);
      router.refresh();
    } catch {
      setError('Error de conexión');
      setSaving(false);
    }
  }

  function handleSave(e) {
    e.preventDefault();
    guardarCambios();
  }

  function handleSaveManual() {
    guardarCambios();
  }

  if (!data) return <div className={styles.page}>Cargando...</div>;

  const rubroInfo = data.rubros.find((r) => r.key === rubro);

  return (
    <div className={styles.page}>
      <PageHeader title="Configuración" subtitle={data.negocio.nombre} />

      <nav className={styles.tabs} role="tablist" aria-label="Secciones de configuración">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`${styles.tabBtn} ${tab === t.key ? styles.tabActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            <span className={styles.tabIcon}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <div className={styles.shell}>
        <div className={styles.main}>
          {tab === 'negocio' && (
            <form className={styles.form} onSubmit={handleSave}>
              <Card className={styles.seccion}>
                <h2 className={styles.seccionTitle}>Datos del negocio</h2>
                <Input label="Nombre del negocio" value={nombre} onChange={(e) => setNombre(e.target.value)} required />

                <span className={styles.fieldLabel}>Rubro</span>
                <div className={styles.rubros}>
                  {data.rubros.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      className={`${styles.rubroBtn} ${rubro === r.key ? styles.rubroBtnActive : ''}`}
                      onClick={() => setRubro(r.key)}
                    >
                      <span className={styles.rubroEmoji}>{r.emoji}</span>
                      <span className={styles.rubroText}>
                        <span className={styles.rubroLabel}>{r.label}</span>
                        <span className={styles.rubroDesc}>{RUBRO_DESC[r.key]}</span>
                      </span>
                    </button>
                  ))}
                </div>
                <p className={styles.hint}>El rubro cambia cómo se muestran los servicios y el flujo de ventas.</p>
              </Card>

              <div className={styles.actions}>
                <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</Button>
              </div>
              {error && <div className={styles.error}>{error}</div>}
              {msg && <div className={styles.msg}>{msg}</div>}
            </form>
          )}

          {tab === 'horarios' && (
            <Card className={styles.seccion}>
              <h2 className={styles.seccionTitle}>Horarios de atención</h2>
              <p className={styles.hint}>
                Los turnos nuevos se validan contra este horario. Si no configurás nada, tu negocio figura
                &quot;abierto todo el día&quot;.
              </p>
              {horariosLoading ? (
                <div className={styles.hint}>Cargando horarios...</div>
              ) : (
                <div className={styles.horarios}>
                  {horarios.map((h) => {
                    const d = DIAS_EDIT.find((x) => x.dia === h.diaSemana);
                    return (
                      <div key={h.diaSemana} className={styles.horarioRow}>
                        <span className={styles.horarioDia}>{d.label}</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={h.abierto}
                          className={`${styles.switch} ${h.abierto ? styles.switchOn : ''}`}
                          onClick={() => setHorario(h.diaSemana, { ...h, abierto: !h.abierto })}
                        >
                          <span className={styles.switchKnob} />
                        </button>
                        <span className={`${styles.horarioEstado} ${h.abierto ? styles.horarioEstadoOn : styles.horarioEstadoOff}`}>
                          {h.abierto ? 'Abierto' : 'Cerrado'}
                        </span>
                        {h.abierto && (
                          <div className={styles.horarioTimes}>
                            <input
                              type="time"
                              className={styles.horarioTime}
                              value={h.apertura}
                              onChange={(e) => setHorario(h.diaSemana, { ...h, apertura: e.target.value })}
                            />
                            <span className={styles.horarioSep}>a</span>
                            <input
                              type="time"
                              className={styles.horarioTime}
                              value={h.cierre}
                              onChange={(e) => setHorario(h.diaSemana, { ...h, cierre: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {horariosError && <div className={styles.error}>{horariosError}</div>}
              {horariosMsg && <div className={styles.msg}>{horariosMsg}</div>}
              <div className={styles.horarioActions}>
                <Button type="button" size="sm" variant="ghost" onClick={limpiarHorarios} disabled={horariosSaving || horariosLoading}>
                  Quitar todos
                </Button>
                <Button type="button" size="sm" onClick={saveHorarios} disabled={horariosSaving || horariosLoading}>
                  {horariosSaving ? 'Guardando...' : 'Guardar horarios'}
                </Button>
              </div>
            </Card>
          )}

          {tab === 'equipo' && (
            <Card className={styles.seccion}>
              <h2 className={styles.seccionTitle}>Equipo y profesionales</h2>
              <EquipoPanel />
            </Card>
          )}

          {tab === 'secciones' && (
            <Card className={styles.seccion}>
              <h2 className={styles.seccionTitle}>Qué secciones mostrar</h2>
              <p className={styles.hint}>
                Activá o desactivá las secciones de la barra lateral. Por ejemplo, un gimnasio que vende creatina puede
                habilitar &quot;Productos&quot;.
              </p>
              <div className={styles.modulos}>
                {data.todosLosModulos.map((m) => {
                  const fijo = MODULOS_FIJOS.includes(m.key);
                  const activo = modulos.includes(m.key);
                  return (
                    <button
                      key={m.key}
                      type="button"
                      role="switch"
                      aria-checked={activo}
                      onClick={() => !fijo && toggleModulo(m.key)}
                      className={`${styles.modulo} ${activo ? styles.moduloOn : styles.moduloOff} ${fijo ? styles.moduloFijo : ''}`}
                    >
                      <span className={styles.moduloIcon}>{activo ? '✓' : '○'}</span>
                      <span className={styles.moduloLabel}>{m.label}</span>
                      {fijo ? <span className={styles.moduloLock}>Siempre visible</span> : null}
                    </button>
                  );
                })}
              </div>
              <div className={styles.actions}>
                <Button type="button" disabled={saving} onClick={handleSaveManual}>{saving ? 'Guardando...' : 'Guardar cambios'}</Button>
              </div>
              {error && <div className={styles.error}>{error}</div>}
              {msg && <div className={styles.msg}>{msg}</div>}
            </Card>
          )}

          {tab === 'datos' && (
            <Card className={styles.seccion}>
              <h2 className={styles.seccionTitle}>Respaldo y exportación</h2>
              <p className={styles.hint}>
                Descargá tus datos en archivos CSV (compatibles con Excel) para guardar respaldo o analizar fuera de la app.
              </p>
              <div className={styles.exportGrid}>
                {[
                  { sec: 'clientes', label: 'Clientes' },
                  { sec: 'turnos', label: 'Turnos' },
                  { sec: 'pagos', label: 'Pagos / Cobros' },
                  { sec: 'servicios', label: 'Servicios' },
                  { sec: 'productos', label: 'Productos' },
                  { sec: 'gastos', label: 'Gastos' },
                  { sec: 'ventas', label: 'Ventas' },
                  { sec: 'todo', label: 'Todo (completo)' },
                ].map((e) => (
                  <a key={e.sec} className={styles.exportBtn} href={`/api/exportar?seccion=${e.sec}`} download>
                    <span className={styles.exportIcon}>⬇️</span>
                    <span>{e.label}</span>
                  </a>
                ))}
              </div>
            </Card>
          )}
        </div>

        <aside className={styles.rail}>
          <Card className={styles.planCard}>
            <h2 className={styles.seccionTitle}>Tu cuenta</h2>
            <div className={styles.planRow}>
              <span className={styles.planLabel}>Plan</span>
              <span className={styles.planValue}>{data.usuario.plan}</span>
            </div>
            <div className={styles.planRow}>
              <span className={styles.planLabel}>Email</span>
              <span className={styles.planValue}>{data.usuario.email}</span>
            </div>
            <div className={styles.planRow}>
              <span className={styles.planLabel}>Rubro</span>
              <span className={styles.planValue}>{rubroInfo?.emoji} {rubroInfo?.label}</span>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
