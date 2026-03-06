import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function formatDate(dateStr) {
    if (!dateStr) return '—'
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
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
        // Filtro de texto
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
        // Filtro de data (Rodou Dia)
        if (dateFrom && e.rodou_dia && e.rodou_dia < dateFrom) return false
        if (dateTo && e.rodou_dia && e.rodou_dia > dateTo) return false
        // Se tem filtro de data mas entregador não tem rodou_dia, esconder
        if ((dateFrom || dateTo) && !e.rodou_dia) return false
        return true
    })

    const totalPages = Math.ceil(filtered.length / perPage)
    const paginated = filtered.slice((page - 1) * perPage, page * perPage)

    // Stats (baseados nos dados filtrados)
    const totalEntregadores = filtered.length
    const totalComCorridas = filtered.filter(e => e.total_corridas_completadas > 0).length
    const totalAtivos = filtered.filter(e => e.data_ativacao).length
    const pracas = [...new Set(filtered.map(e => e.praca).filter(Boolean))]
    const totalCorridas = filtered.reduce((acc, e) => acc + (Number(e.total_corridas_completadas) || 0), 0)

    // Reset to page 1 when filters change
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
