import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Zap, Table as TableIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../utils';

interface UploadZoneProps {
    onFileDrop: (file: File) => void;
}

export default function UploadZone({ onFileDrop }: UploadZoneProps) {
    const onDrop = (acceptedFiles: File[]) => {
        const selectedFile = acceptedFiles[0];
        if (selectedFile && selectedFile.type === 'application/pdf') {
            onFileDrop(selectedFile);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        multiple: false
    } as any);

    const steps = [
        { icon: Upload, title: 'Upload PDF', desc: 'Drop your DIALux report file' },
        { icon: Zap, title: 'AI Analysis', desc: 'Gemini extracts room data' },
        { icon: TableIcon, title: 'Get Results', desc: 'View, edit, and export data' },
    ];

    return (
        <div className="flex flex-col items-center justify-center w-full gap-16 py-8">
            {/* Drop Zone */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                {...getRootProps()}
                className={cn(
                    "w-full max-w-2xl border-2 border-dashed border-[#141414] p-12 flex flex-col items-center justify-center gap-6 cursor-pointer transition-all rounded-lg bg-white/30 backdrop-blur-sm",
                    isDragActive ? "bg-white/60 scale-[1.02] border-solid" : "hover:bg-white/40"
                )}
            >
                <input {...getInputProps()} />
                <div className="w-20 h-20 rounded-full border border-[#141414] flex items-center justify-center">
                    <Upload size={32} strokeWidth={1.5} />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-serif italic mb-2">Drop your DIALux PDF here</h2>
                    <p className="text-sm opacity-60 font-mono uppercase tracking-wider">or click to browse files</p>
                </div>

                {/* Supported Formats */}
                <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5 bg-[#141414]/5 px-3 py-1.5 rounded-full">
                        <FileText size={12} className="opacity-50" />
                        <span className="text-[10px] font-mono uppercase tracking-wider opacity-60">DIALux evo</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-[#141414]/5 px-3 py-1.5 rounded-full">
                        <FileText size={12} className="opacity-50" />
                        <span className="text-[10px] font-mono uppercase tracking-wider opacity-60">DIALux 4.13</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-[#141414]/5 px-3 py-1.5 rounded-full">
                        <span className="text-[10px] font-mono uppercase tracking-wider opacity-60">.PDF only</span>
                    </div>
                </div>
            </motion.div>

            {/* How it works */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="w-full max-w-2xl"
            >
                <h3 className="text-[10px] font-mono uppercase tracking-[0.3em] opacity-30 mb-6 text-center">How it works</h3>
                <div className="grid grid-cols-3 gap-6">
                    {steps.map((step, i) => (
                        <div key={i} className="text-center group">
                            <div className="w-12 h-12 rounded-full border border-[#141414]/20 flex items-center justify-center mx-auto mb-3 group-hover:bg-[#141414] group-hover:text-[#E4E3E0] transition-all">
                                <step.icon size={20} strokeWidth={1.5} />
                            </div>
                            <h4 className="text-sm font-medium mb-1">{step.title}</h4>
                            <p className="text-[10px] font-mono opacity-40 uppercase tracking-wider">{step.desc}</p>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
