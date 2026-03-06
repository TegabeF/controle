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
        if (!search) return true
        const q = search.toLowerCase()
        return (
            e.nome_entregador?.toLowerCase().includes(q) ||
            e.id_entregador?.toLowerCase().includes(q) ||
            e.praca?.toLowerCase().includes(q) ||
            e.sub_praca?.toLowerCase().includes(q)
        )
    })

    const totalPages = Math.ceil(filtered.length / perPage)
    const paginated = filtered.slice((page - 1) * perPage, page * perPage)

    // Stats
    const totalEntregadores = entregadores.length
    const totalComCorridas = entregadores.filter(e => e.total_corridas_completadas > 0).length
    const pracas = [...new Set(entregadores.map(e => e.praca).filter(Boolean))]
    const totalCorridas = entregadores.reduce((acc, e) => acc + (Number(e.total_corridas_completadas) || 0), 0)

    // Reset to page 1 when search changes
    useEffect(() => {
        setPage(1)
    }, [search])

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
                        <div className="table-search">
                            <span className="table-search-icon">🔍</span>
                            <input
                                type="text"
                                placeholder="Buscar por nome, ID, praça..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
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
