import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Table as TableIcon,
    AlertCircle,
    Pencil,
} from 'lucide-react';
import { DialuxRoom, parseValueUnit } from '../services/geminiService';
import ProgressIndicator, { ProcessingStep } from './ProgressIndicator';

interface DataTableProps {
    rooms: DialuxRoom[] | null;
    processingStep: ProcessingStep;
    error: { message: string; type: 'pdf' | 'ai' | 'general' } | null;
    onRetry: () => void;
    onUpdateRoom: (roomIndex: number, field: keyof DialuxRoom, value: string) => void;
    onNavigateToPage: (page: number) => void;
    modifiedCells: Set<string>;
}

type ColumnDef = {
    key: keyof DialuxRoom;
    label: string;
    shortLabel: string;
    minWidth: string;
};

const columns: ColumnDef[] = [
    { key: 'roomName', label: 'Room Name', shortLabel: 'Room', minWidth: 'min-w-[140px]' },
    { key: 'eTarget', label: 'Ē Target', shortLabel: 'Target', minWidth: 'min-w-[80px]' },
    { key: 'aRoom', label: 'Area (ARoom)', shortLabel: 'Area', minWidth: 'min-w-[80px]' },
    { key: 'eWorkplane', label: 'Ē Workplane', shortLabel: 'Ē WP', minWidth: 'min-w-[80px]' },
    { key: 'lpdSpace', label: 'LPD Space', shortLabel: 'LPD Sp', minWidth: 'min-w-[80px]' },
    { key: 'lpdWorkingPlane', label: 'LPD Working Plane', shortLabel: 'LPD WP', minWidth: 'min-w-[80px]' },
];

export default function DataTable({
    rooms,
    processingStep,
    error,
    onRetry,
    onUpdateRoom,
    onNavigateToPage,
    modifiedCells,
}: DataTableProps) {
    const [editingCell, setEditingCell] = useState<{ rowIdx: number; field: keyof DialuxRoom } | null>(null);

    const isLoading = processingStep === 'reading-pdf' || processingStep === 'analyzing';

    const startEditing = (e: React.MouseEvent, rowIdx: number, field: keyof DialuxRoom) => {
        e.stopPropagation();
        setEditingCell({ rowIdx, field });
    };

    const handleInputChange = (rowIdx: number, field: keyof DialuxRoom, newNumericValue: string, unit: string) => {
        const newValue = unit ? `${newNumericValue} ${unit}` : newNumericValue;
        onUpdateRoom(rowIdx, field, newValue);
    };

    const stopEditing = () => {
        setEditingCell(null);
    };

    const handleCellClick = (room: DialuxRoom) => {
        if (editingCell) return; // don't navigate while editing
        if (room.pageRef && room.pageRef > 0) {
            onNavigateToPage(room.pageRef);
        }
    };

    // Data columns exclude roomName (not editable)
    const isEditableColumn = (key: keyof DialuxRoom) => key !== 'roomName' && key !== 'pageRef';

    return (
        <div className="flex flex-col gap-2 h-full overflow-hidden">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TableIcon size={14} className="opacity-40" />
                    <span className="text-[10px] font-mono uppercase tracking-widest opacity-50">Extracted Data</span>
                </div>
                {rooms && (
                    <span className="text-[10px] font-mono opacity-40 uppercase">
                        {rooms.length} room{rooms.length !== 1 ? 's' : ''} found
                    </span>
                )}
            </div>

            <div className="flex-1 overflow-auto">
                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <div key="progress"><ProgressIndicator step={processingStep} /></div>
                    ) : error ? (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="h-full flex flex-col items-center justify-center gap-6 p-8 text-center"
                        >
                            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                                <AlertCircle size={32} strokeWidth={1.5} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-serif italic text-xl text-[#141414]">
                                    {error.type === 'pdf' ? 'PDF Reading Failed' :
                                        error.type === 'ai' ? 'Analysis Incomplete' :
                                            'Processing Error'}
                                </h3>
                                <p className="text-sm text-[#141414]/60 leading-relaxed max-w-xs mx-auto">
                                    {error.message}
                                </p>
                            </div>
                            <div className="flex flex-col gap-3 w-full max-w-xs">
                                <button
                                    onClick={onRetry}
                                    className="bg-[#141414] text-[#E4E3E0] py-3 rounded-sm text-xs font-mono uppercase tracking-widest hover:bg-[#333] transition-colors"
                                >
                                    Retry Analysis
                                </button>
                            </div>
                        </motion.div>
                    ) : rooms && rooms.length > 0 ? (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col h-full"
                        >
                            <div className="flex-1 overflow-auto border border-[#141414]/10 rounded-sm">
                                <table className="w-full text-xs border-collapse">
                                    <thead className="sticky top-0 z-10">
                                        <tr className="bg-[#141414] text-[#E4E3E0]">
                                            <th className="text-[10px] font-mono uppercase tracking-widest p-2 text-left font-normal w-[32px]">
                                                #
                                            </th>
                                            {columns.map(col => (
                                                <th
                                                    key={col.key}
                                                    className={`text-[10px] font-mono uppercase tracking-widest p-2 text-left font-normal ${col.minWidth}`}
                                                    title={col.label}
                                                >
                                                    {col.shortLabel}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rooms.map((room, rowIdx) => (
                                            <tr
                                                key={rowIdx}
                                                className="border-t border-[#141414]/8 hover:bg-blue-50/40 transition-colors cursor-pointer group"
                                                onClick={() => handleCellClick(room)}
                                            >
                                                <td className="p-2 font-mono text-[10px] opacity-30 text-center">
                                                    {rowIdx + 1}
                                                </td>
                                                {columns.map(col => {
                                                    const rawVal = String(room[col.key] || '');
                                                    const { value, unit } = parseValueUnit(rawVal);
                                                    const isModified = modifiedCells.has(`${rowIdx}:${col.key}`);
                                                    const isCellEditing = editingCell?.rowIdx === rowIdx && editingCell?.field === col.key;
                                                    const editable = isEditableColumn(col.key);

                                                    // Color logic for eWorkplane
                                                    let cellColor = '';
                                                    if (col.key === 'eWorkplane' && room.eTarget && room.eWorkplane) {
                                                        const wpVal = parseFloat(parseValueUnit(room.eWorkplane).value);
                                                        const targetVal = parseFloat(parseValueUnit(room.eTarget).value);
                                                        if (!isNaN(wpVal) && !isNaN(targetVal)) {
                                                            cellColor = wpVal >= targetVal ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold';
                                                        }
                                                    }

                                                    // Editing mode: inline input that auto-saves
                                                    if (isCellEditing) {
                                                        return (
                                                            <td
                                                                key={col.key}
                                                                className="p-1 bg-teal-50"
                                                                onClick={e => e.stopPropagation()}
                                                            >
                                                                <div className="flex items-center gap-1">
                                                                    <input
                                                                        autoFocus
                                                                        className="w-16 bg-white border border-teal-300 px-1.5 py-0.5 text-xs font-mono rounded-sm focus:outline-none focus:ring-1 focus:ring-teal-400"
                                                                        value={value}
                                                                        onChange={e => handleInputChange(rowIdx, col.key, e.target.value, unit)}
                                                                        onBlur={stopEditing}
                                                                        onKeyDown={e => {
                                                                            if (e.key === 'Enter' || e.key === 'Escape') stopEditing();
                                                                        }}
                                                                    />
                                                                    {unit && <span className="text-[9px] opacity-40 font-mono whitespace-nowrap">{unit}</span>}
                                                                </div>
                                                            </td>
                                                        );
                                                    }

                                                    // Display mode
                                                    return (
                                                        <td
                                                            key={col.key}
                                                            className={`p-2 font-mono ${isModified ? 'bg-teal-50' : ''}`}
                                                        >
                                                            <span className="inline-flex items-center gap-1">
                                                                {col.key === 'roomName' ? (
                                                                    <span className="font-medium">{rawVal}</span>
                                                                ) : (
                                                                    <>
                                                                        <span className={cellColor}>{value || '-'}</span>
                                                                        {unit && <span className="text-[9px] opacity-35">{unit}</span>}
                                                                        {editable && (
                                                                            <button
                                                                                onClick={(e) => startEditing(e, rowIdx, col.key)}
                                                                                className="p-0.5 opacity-0 group-hover:opacity-30 hover:!opacity-100 hover:bg-[#141414]/5 rounded transition-opacity ml-0.5"
                                                                                title={`Edit ${col.shortLabel}`}
                                                                            >
                                                                                <Pencil size={9} />
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </span>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="h-full flex items-center justify-center opacity-20 italic font-serif">
                            Waiting for file analysis...
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
