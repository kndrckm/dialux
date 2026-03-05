import { useState } from 'react';
import { FileText, Download, KeyRound, RefreshCw } from 'lucide-react';
import { DialuxRoom } from '../services/geminiService';

interface HeaderProps {
    rooms: DialuxRoom[] | null;
    onExportCSV: () => void;
    onChangeApiKey: () => void;
    onReset: () => void;
}

export default function Header({ rooms, onExportCSV, onChangeApiKey, onReset }: HeaderProps) {
    const [showConfirm, setShowConfirm] = useState(false);

    const handleReset = () => {
        setShowConfirm(false);
        onReset();
    };

    return (
        <>
            <header className="border-b border-[#141414]/15 px-4 py-2 flex justify-between items-center bg-white">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#141414] flex items-center justify-center rounded-sm">
                        <FileText className="text-[#E4E3E0] w-4 h-4" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold tracking-tight uppercase">DIALux Report Extractor</h1>
                        <p className="text-[9px] font-mono opacity-40 uppercase tracking-widest">v1.0.0 // Technical Data Parser</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onChangeApiKey}
                        className="flex items-center gap-2 border border-[#141414]/15 text-[#141414] px-2 py-1.5 rounded-sm hover:bg-[#141414]/5 transition-colors text-xs"
                        title="Change API Key"
                    >
                        <KeyRound size={12} />
                    </button>

                    {rooms && rooms.length > 0 && (
                        <>
                            <button
                                onClick={() => setShowConfirm(true)}
                                className="flex items-center gap-1.5 border border-[#141414]/15 text-[#141414] px-3 py-1.5 rounded-sm hover:bg-[#141414]/5 transition-colors text-xs font-medium"
                            >
                                <RefreshCw size={12} />
                                NEW REPORT
                            </button>
                            <button
                                onClick={onExportCSV}
                                className="flex items-center gap-1.5 bg-[#141414] text-[#E4E3E0] px-3 py-1.5 rounded-sm hover:bg-[#333] transition-colors text-xs font-medium"
                            >
                                <Download size={14} />
                                EXPORT CSV
                            </button>
                        </>
                    )}
                </div>
            </header>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="bg-white rounded-md shadow-2xl p-6 max-w-sm w-full mx-4 space-y-4">
                        <h3 className="text-base font-semibold">Start New Report?</h3>
                        <p className="text-sm text-[#141414]/60 leading-relaxed">
                            This will remove all extracted data and return to the upload screen. This action cannot be undone.
                        </p>
                        <div className="flex gap-2 justify-end pt-2">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="px-4 py-2 text-xs font-medium border border-[#141414]/15 rounded-sm hover:bg-[#141414]/5 transition-colors"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={handleReset}
                                className="px-4 py-2 text-xs font-medium bg-red-600 text-white rounded-sm hover:bg-red-700 transition-colors"
                            >
                                REMOVE & START NEW
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
