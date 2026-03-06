import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'

const COLUMN_MAP = {
    'data_do_periodo': 'data_do_periodo',
    'periodo': 'periodo',
    'duracao_do_periodo': 'duracao_do_periodo',
    'numero_minimo_de_entregadores_regulares_na_escala': 'numero_minimo_entregadores_regulares',
    'tag': 'tag',
    'id_da_pessoa_entregadora': 'id_entregador',
    'pessoa_entregadora': 'nome_entregador',
    'praca': 'praca',
    'sub_praca': 'sub_praca',
    'origem': 'origem',
    'tempo_disponivel_escalado': 'tempo_disponivel_escalado',
    'tempo_disponivel_absoluto': 'tempo_disponivel_absoluto',
    'numero_de_corridas_ofertadas': 'numero_corridas_ofertadas',
    'numero_de_corridas_aceitas': 'numero_corridas_aceitas',
    'numero_de_corridas_rejeitadas': 'numero_corridas_rejeitadas',
    'numero_de_corridas_completadas': 'numero_corridas_completadas',
    'numero_de_corridas_canceladas_pela_pessoa_entregadora': 'numero_corridas_canceladas',
    'numero_de_pedidos_aceitos_e_concluidos': 'numero_pedidos_aceitos_concluidos',
    'soma_das_taxas_das_corridas_aceitas': 'soma_taxas_corridas_aceitas',
}

function excelDateToISO(serial) {
    if (!serial) return null
    if (typeof serial === 'string') {
        // Try to parse common date formats
        const parts = serial.split(/[\/\-]/)
        if (parts.length === 3) {
            // DD/MM/YYYY or YYYY-MM-DD
            if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
        }
        return serial
    }
    // Excel serial date
    const utcDays = Math.floor(serial - 25569)
    const date = new Date(utcDays * 86400 * 1000)
    return date.toISOString().split('T')[0]
}

function parseNum(val) {
    if (val === null || val === undefined || val === '') return null
    const n = Number(val)
    return isNaN(n) ? null : n
}

export default function Upload() {
    const [dragOver, setDragOver] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [status, setStatus] = useState(null) // { type: 'success' | 'error', message }
    const [fileName, setFileName] = useState('')
    const [rowCount, setRowCount] = useState(0)
    const fileInputRef = useRef(null)

    const processFile = async (file) => {
        setFileName(file.name)
        setUploading(true)
        setProgress(0)
        setStatus(null)

        try {
            const data = await file.arrayBuffer()
            const workbook = XLSX.read(data)
            const sheet = workbook.Sheets[workbook.SheetNames[0]]
            const rawRows = XLSX.utils.sheet_to_json(sheet)

            if (rawRows.length === 0) {
                setStatus({ type: 'error', message: 'O arquivo está vazio ou não contém dados válidos.' })
                setUploading(false)
                return
            }

            setRowCount(rawRows.length)

            // Map columns
            const mappedRows = rawRows.map(row => {
                const mapped = {}
                for (const [excelCol, dbCol] of Object.entries(COLUMN_MAP)) {
                    const val = row[excelCol]
                    if (dbCol === 'data_do_periodo') {
                        mapped[dbCol] = excelDateToISO(val)
                    } else if ([
                        'numero_minimo_entregadores_regulares',
                        'numero_corridas_ofertadas',
                        'numero_corridas_aceitas',
                        'numero_corridas_rejeitadas',
                        'numero_corridas_completadas',
                        'numero_corridas_canceladas',
                        'numero_pedidos_aceitos_concluidos'
                    ].includes(dbCol)) {
                        mapped[dbCol] = parseNum(val)
                    } else if ([
                        'tempo_disponivel_escalado',
                        'tempo_disponivel_absoluto',
                        'soma_taxas_corridas_aceitas'
                    ].includes(dbCol)) {
                        mapped[dbCol] = parseNum(val)
                    } else {
                        mapped[dbCol] = val !== undefined && val !== null ? String(val) : null
                    }
                }
                return mapped
            })

            // Upload in batches via RPC
            const batchSize = 200
            const totalBatches = Math.ceil(mappedRows.length / batchSize)

            for (let i = 0; i < totalBatches; i++) {
                const batch = mappedRows.slice(i * batchSize, (i + 1) * batchSize)
                const { error } = await supabase.rpc('bulk_insert_entregas', { dados: batch })

                if (error) {
                    setStatus({ type: 'error', message: `Erro no lote ${i + 1}: ${error.message}` })
                    setUploading(false)
                    return
                }

                setProgress(Math.round(((i + 1) / totalBatches) * 100))
            }

            setStatus({ type: 'success', message: `${mappedRows.length} registros importados com sucesso!` })
        } catch (err) {
            setStatus({ type: 'error', message: `Erro ao processar arquivo: ${err.message}` })
        } finally {
            setUploading(false)
        }
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) processFile(file)
    }

    const handleFileSelect = (e) => {
        const file = e.target.files[0]
        if (file) processFile(file)
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1 className="page-title">📤 Upload de Dados</h1>
                <p className="page-subtitle">Importe seus arquivos Excel com dados de entregadores</p>
            </div>

            <div className="upload-container">
                <div
                    className={`upload-dropzone ${dragOver ? 'drag-over' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="upload-dropzone-icon">📊</div>
                    <div className="upload-dropzone-text">
                        {dragOver ? 'Solte o arquivo aqui!' : 'Arraste um arquivo Excel ou clique para selecionar'}
                    </div>
                    <div className="upload-dropzone-hint">
                        Formatos aceitos: .xlsx, .xls
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileSelect}
                    />
                </div>

                {uploading && (
                    <div className="upload-progress">
                        <div className="progress-info">
                            <span className="progress-label">
                                Importando {fileName} ({rowCount} registros)
                            </span>
                            <span className="progress-value">{progress}%</span>
                        </div>
                        <div className="progress-bar-wrapper">
                            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                )}

                {status && (
                    <div className={`status-message status-${status.type}`}>
                        <span>{status.type === 'success' ? '✅' : '❌'}</span>
                        <span>{status.message}</span>
                    </div>
                )}
            </div>
        </div>
    )
}
