import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'

function formatDate(dateStr) {
    if (!dateStr) return '—'
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/* ───── Chart Colors ───── */
const COLORS_CORRIDAS = ['#6366f1', '#1e293b']
const COLORS_ATIVOS = ['#22c55e', '#1e293b']
const COLORS_BARS = ['#6366f1', '#818cf8', '#a78bfa', '#c4b5fd', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6']

/* ───── Custom Tooltip ───── */
function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    return (
        <div className="chart-tooltip">
            {label && <div className="chart-tooltip-label">{label}</div>}
            {payload.map((p, i) => (
                <div key={i} className="chart-tooltip-row">
                    <span className="chart-tooltip-dot" style={{ background: p.color || p.payload?.fill }} />
                    <span>{p.name}:</span>
                    <strong>{typeof p.value === 'number' ? p.value.toLocaleString('pt-BR') : p.value}</strong>
                </div>
            ))}
        </div>
    )
}

/* ───── Custom Pie Label ───── */
function renderPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }) {
    if (percent < 0.05) return null
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    return (
        <text x={x} y={y} fill="#f1f5f9" textAnchor="middle" dominantBaseline="central"
            fontSize={14} fontWeight={700}>
            {value}
        </text>
    )
}

export default function Dashboard() {
    const [entregadores, setEntregadores] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [page, setPage] = useState(1)
    const perPage = 15

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .rpc('get_entregadores_resumo')

        if (error) {
            console.error('Erro ao buscar dados:', error)
        } else {
            setEntregadores(data || [])
        }
        setLoading(false)
    }

    const filtered = entregadores.filter(e => {
        if (search) {
            const q = search.toLowerCase()
            const match = (
                e.nome_entregador?.toLowerCase().includes(q) ||
                e.id_entregador?.toLowerCase().includes(q) ||
                e.praca?.toLowerCase().includes(q) ||
                e.sub_praca?.toLowerCase().includes(q)
            )
            if (!match) return false
        }
        if (dateFrom && e.rodou_dia && e.rodou_dia < dateFrom) return false
        if (dateTo && e.rodou_dia && e.rodou_dia > dateTo) return false
        if ((dateFrom || dateTo) && !e.rodou_dia) return false
        return true
    })

    const totalPages = Math.ceil(filtered.length / perPage)
    const paginated = filtered.slice((page - 1) * perPage, page * perPage)

    // Stats
    const totalEntregadores = filtered.length
    const totalComCorridas = filtered.filter(e => e.total_corridas_completadas > 0).length
    const totalSemCorridas = totalEntregadores - totalComCorridas
    const totalAtivos = filtered.filter(e => e.data_ativacao).length
    const totalInativos = totalEntregadores - totalAtivos
    const pracas = [...new Set(filtered.map(e => e.praca).filter(Boolean))]
    const totalCorridas = filtered.reduce((acc, e) => acc + (Number(e.total_corridas_completadas) || 0), 0)

    // ──── Chart Data (memoized) ────
    const pieCorridasData = useMemo(() => [
        { name: 'Com Corridas', value: totalComCorridas },
        { name: 'Sem Corridas', value: totalSemCorridas },
    ], [totalComCorridas, totalSemCorridas])

    const pieAtivosData = useMemo(() => [
        { name: 'Ativos (≥30)', value: totalAtivos },
        { name: 'Inativos', value: totalInativos },
    ], [totalAtivos, totalInativos])

    const barCorridasPorPraca = useMemo(() => {
        const map = {}
        filtered.forEach(e => {
            const p = e.praca || 'Sem Praça'
            if (!map[p]) map[p] = { praca: p, comCorridas: 0, semCorridas: 0 }
            if (e.total_corridas_completadas > 0) map[p].comCorridas++
            else map[p].semCorridas++
        })
        return Object.values(map).sort((a, b) => (b.comCorridas + b.semCorridas) - (a.comCorridas + a.semCorridas))
    }, [filtered])

    const barAtivosPorPraca = useMemo(() => {
        const map = {}
        filtered.forEach(e => {
            const p = e.praca || 'Sem Praça'
            if (!map[p]) map[p] = { praca: p, ativos: 0, inativos: 0 }
            if (e.data_ativacao) map[p].ativos++
            else map[p].inativos++
        })
        return Object.values(map).sort((a, b) => (b.ativos + b.inativos) - (a.ativos + a.inativos))
    }, [filtered])

    useEffect(() => {
        setPage(1)
    }, [search, dateFrom, dateTo])

    if (loading) {
        return (
            <div className="fade-in">
                <div className="page-header">
                    <h1 className="page-title">📊 Dashboard</h1>
                    <p className="page-subtitle">Resumo dos entregadores</p>
                </div>
                <div className="loading-container">
                    <div className="spinner" />
                    <span className="loading-text">Carregando dados...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1 className="page-title">📊 Dashboard</h1>
                <p className="page-subtitle">Resumo dos entregadores cadastrados</p>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-card-icon">👥</div>
                    <div className="stat-card-value">{totalEntregadores}</div>
                    <div className="stat-card-label">Total de Entregadores</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon">✅</div>
                    <div className="stat-card-value">{totalAtivos}</div>
                    <div className="stat-card-label">Entregadores Ativos (≥30)</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon">🚴</div>
                    <div className="stat-card-value">{totalComCorridas}</div>
                    <div className="stat-card-label">Com Corridas Completadas</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon">📍</div>
                    <div className="stat-card-value">{pracas.length}</div>
                    <div className="stat-card-label">Praças Ativas</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon">📦</div>
                    <div className="stat-card-value">{totalCorridas.toLocaleString('pt-BR')}</div>
                    <div className="stat-card-label">Total de Corridas</div>
                </div>
            </div>

            {/* ════════ CHARTS SECTION ════════ */}
            {totalEntregadores > 0 && (
                <div className="charts-section">
                    <h2 className="section-title">📈 Visão Geral</h2>

                    {/* Row 1: Donut charts */}
                    <div className="charts-row">
                        {/* Corridas Completadas */}
                        <div className="chart-card">
                            <h3 className="chart-card-title">🚴 Corridas Completadas</h3>
                            <p className="chart-card-subtitle">Entregadores com pelo menos 1 corrida</p>
                            <div className="chart-wrapper">
                                <ResponsiveContainer width="100%" height={260}>
                                    <PieChart>
                                        <Pie
                                            data={pieCorridasData}
                                            cx="50%" cy="50%"
                                            innerRadius={60} outerRadius={100}
                                            paddingAngle={4}
                                            dataKey="value"
                                            labelLine={false}
                                            label={renderPieLabel}
                                            animationBegin={0}
                                            animationDuration={800}
                                        >
                                            {pieCorridasData.map((_, idx) => (
                                                <Cell key={idx} fill={COLORS_CORRIDAS[idx]} stroke="none" />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<ChartTooltip />} />
                                        <Legend
                                            verticalAlign="bottom"
                                            iconType="circle"
                                            iconSize={10}
                                            wrapperStyle={{ fontSize: '0.8rem', color: '#94a3b8' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="chart-highlight">
                                <span className="chart-highlight-value">
                                    {totalEntregadores > 0 ? Math.round((totalComCorridas / totalEntregadores) * 100) : 0}%
                                </span>
                                <span className="chart-highlight-label">com corridas</span>
                            </div>
                        </div>

                        {/* Entregadores Ativos */}
                        <div className="chart-card">
                            <h3 className="chart-card-title">✅ Entregadores Ativos</h3>
                            <p className="chart-card-subtitle">Atingiram ≥30 rotas (ativação)</p>
                            <div className="chart-wrapper">
                                <ResponsiveContainer width="100%" height={260}>
                                    <PieChart>
                                        <Pie
                                            data={pieAtivosData}
                                            cx="50%" cy="50%"
                                            innerRadius={60} outerRadius={100}
                                            paddingAngle={4}
                                            dataKey="value"
                                            labelLine={false}
                                            label={renderPieLabel}
                                            animationBegin={200}
                                            animationDuration={800}
                                        >
                                            {pieAtivosData.map((_, idx) => (
                                                <Cell key={idx} fill={COLORS_ATIVOS[idx]} stroke="none" />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<ChartTooltip />} />
                                        <Legend
                                            verticalAlign="bottom"
                                            iconType="circle"
                                            iconSize={10}
                                            wrapperStyle={{ fontSize: '0.8rem', color: '#94a3b8' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="chart-highlight chart-highlight--green">
                                <span className="chart-highlight-value">
                                    {totalEntregadores > 0 ? Math.round((totalAtivos / totalEntregadores) * 100) : 0}%
                                </span>
                                <span className="chart-highlight-label">ativos</span>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Bar charts */}
                    <div className="charts-row">
                        {/* Corridas por Praça */}
                        <div className="chart-card chart-card--wide">
                            <h3 className="chart-card-title">📍 Corridas Completadas por Praça</h3>
                            <p className="chart-card-subtitle">Distribuição de entregadores com e sem corridas por praça</p>
                            <div className="chart-wrapper">
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={barCorridasPorPraca} barGap={2}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                                        <XAxis
                                            dataKey="praca" tick={{ fill: '#94a3b8', fontSize: 12 }}
                                            axisLine={{ stroke: 'rgba(148,163,184,0.1)' }}
                                            tickLine={false}
                                            interval={0}
                                            angle={barCorridasPorPraca.length > 5 ? -30 : 0}
                                            textAnchor={barCorridasPorPraca.length > 5 ? 'end' : 'middle'}
                                            height={barCorridasPorPraca.length > 5 ? 80 : 40}
                                        />
                                        <YAxis
                                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                                            axisLine={{ stroke: 'rgba(148,163,184,0.1)' }}
                                            tickLine={false}
                                            allowDecimals={false}
                                        />
                                        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                                        <Legend
                                            verticalAlign="top"
                                            iconType="circle"
                                            iconSize={10}
                                            wrapperStyle={{ fontSize: '0.8rem', color: '#94a3b8', paddingBottom: '0.5rem' }}
                                        />
                                        <Bar dataKey="comCorridas" name="Com Corridas" fill="#6366f1" radius={[6, 6, 0, 0]} />
                                        <Bar dataKey="semCorridas" name="Sem Corridas" fill="#1e293b" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Ativos por Praça */}
                        <div className="chart-card chart-card--wide">
                            <h3 className="chart-card-title">🏆 Entregadores Ativos por Praça</h3>
                            <p className="chart-card-subtitle">Quantidade de entregadores que atingiram ≥30 rotas por praça</p>
                            <div className="chart-wrapper">
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={barAtivosPorPraca} barGap={2}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                                        <XAxis
                                            dataKey="praca" tick={{ fill: '#94a3b8', fontSize: 12 }}
                                            axisLine={{ stroke: 'rgba(148,163,184,0.1)' }}
                                            tickLine={false}
                                            interval={0}
                                            angle={barAtivosPorPraca.length > 5 ? -30 : 0}
                                            textAnchor={barAtivosPorPraca.length > 5 ? 'end' : 'middle'}
                                            height={barAtivosPorPraca.length > 5 ? 80 : 40}
                                        />
                                        <YAxis
                                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                                            axisLine={{ stroke: 'rgba(148,163,184,0.1)' }}
                                            tickLine={false}
                                            allowDecimals={false}
                                        />
                                        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(34,197,94,0.06)' }} />
                                        <Legend
                                            verticalAlign="top"
                                            iconType="circle"
                                            iconSize={10}
                                            wrapperStyle={{ fontSize: '0.8rem', color: '#94a3b8', paddingBottom: '0.5rem' }}
                                        />
                                        <Bar dataKey="ativos" name="Ativos (≥30)" fill="#22c55e" radius={[6, 6, 0, 0]} />
                                        <Bar dataKey="inativos" name="Inativos" fill="#1e293b" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            {entregadores.length === 0 ? (
                <div className="table-container">
                    <div className="empty-state">
                        <div className="empty-state-icon">📭</div>
                        <div className="empty-state-text">Nenhum dado encontrado</div>
                        <div className="empty-state-hint">Faça upload de um arquivo Excel na página de Upload.</div>
                    </div>
                </div>
            ) : (
                <div className="table-container">
                    <div className="table-header">
                        <h2 className="table-title">Entregadores</h2>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div className="table-search">
                                <span className="table-search-icon">🔍</span>
                                <input
                                    type="text"
                                    placeholder="Buscar por nome, ID, praça..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>Rodou Dia:</span>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    style={{
                                        background: 'var(--bg-input)', border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.6rem',
                                        color: 'var(--text-primary)', fontSize: '0.8rem', fontFamily: 'inherit',
                                        outline: 'none'
                                    }}
                                />
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>até</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    style={{
                                        background: 'var(--bg-input)', border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.6rem',
                                        color: 'var(--text-primary)', fontSize: '0.8rem', fontFamily: 'inherit',
                                        outline: 'none'
                                    }}
                                />
                                {(dateFrom || dateTo) && (
                                    <button
                                        onClick={() => { setDateFrom(''); setDateTo('') }}
                                        style={{
                                            background: 'var(--error-bg)', border: '1px solid rgba(239,68,68,0.2)',
                                            borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.6rem',
                                            color: 'var(--error)', fontSize: '0.75rem', fontFamily: 'inherit',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✕ Limpar
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Entregador</th>
                                <th>ID</th>
                                <th>Praça</th>
                                <th>Sub-Praça</th>
                                <th>1ª Data no Relatório</th>
                                <th>Rodou Dia</th>
                                <th>Última Entrega</th>
                                <th>Ativação (≥30)</th>
                                <th>Corridas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map((e, i) => (
                                <tr key={`${e.id_entregador}-${i}`}>
                                    <td className="cell-name">{e.nome_entregador || '—'}</td>
                                    <td><span className="cell-id">{e.id_entregador || '—'}</span></td>
                                    <td><span className="cell-badge badge-praca">{e.praca || '—'}</span></td>
                                    <td className="cell-date">{e.sub_praca || '—'}</td>
                                    <td className="cell-date">{formatDate(e.primeira_data_relatorio)}</td>
                                    <td className={e.rodou_dia ? 'cell-date-highlight' : 'cell-date'}>
                                        {formatDate(e.rodou_dia)}
                                    </td>
                                    <td className="cell-date">{formatDate(e.ultima_entrega)}</td>
                                    <td className={e.data_ativacao ? 'cell-date-highlight' : 'cell-date'}>
                                        {e.data_ativacao ? formatDate(e.data_ativacao) : '—'}
                                    </td>
                                    <td className="cell-name">{e.total_corridas_completadas ?? 0}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="table-footer">
                        <span className="table-footer-info">
                            Mostrando {paginated.length} de {filtered.length} entregadores
                            {search && ` (filtrado de ${entregadores.length})`}
                        </span>
                        <div className="table-pagination">
                            <button
                                className="pagination-btn"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                ← Anterior
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum
                                if (totalPages <= 5) {
                                    pageNum = i + 1
                                } else if (page <= 3) {
                                    pageNum = i + 1
                                } else if (page >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i
                                } else {
                                    pageNum = page - 2 + i
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        className={`pagination-btn ${page === pageNum ? 'active' : ''}`}
                                        onClick={() => setPage(pageNum)}
                                    >
                                        {pageNum}
                                    </button>
                                )
                            })}
                            <button
                                className="pagination-btn"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || totalPages === 0}
                            >
                                Próximo →
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
