/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import * as diff from 'diff';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutGrid, 
  Settings, 
  Home, 
  RotateCcw, 
  FileText, 
  Type, 
  Hash, 
  Percent,
  ChevronRight,
  Search,
  Code,
  Database,
  Terminal,
  FileJson,
  FileCode,
  Globe,
  Calendar,
  Clock,
  Binary,
  Layers,
  Wand2,
  Menu,
  X,
  FileUp,
  Loader2,
  AlertCircle
} from 'lucide-react';

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// --- OOP Design ---

interface Stats {
  lines: number;
  words: number;
  chars: number;
}

class TextAnalyzer {
  static formatLineNumbers(numbers: number[]): string {
    if (numbers.length === 0) return "None";
    const ranges: string[] = [];
    let start = numbers[0];
    let end = numbers[0];
    
    for (let i = 1; i < numbers.length; i++) {
      if (numbers[i] === end + 1) {
        end = numbers[i];
      } else {
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        start = numbers[i];
        end = numbers[i];
      }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    return ranges.join(', ');
  }

  static getStats(text: string): Stats {
    const lines = text.split(/\r?\n/).length;
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    const chars = text.length;
    return { lines, words, chars };
  }
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber?: number;
}

class DiffEngine {
  private original: string;
  private modified: string;

  constructor(original: string, modified: string) {
    this.original = original;
    this.modified = modified;
  }

  calculateSimilarity(): number {
    if (this.original === this.modified) return 100;
    if (!this.original || !this.modified) return 0;

    const changes = diff.diffChars(this.original, this.modified);
    let commonChars = 0;
    changes.forEach(part => {
      if (!part.added && !part.removed) {
        commonChars += part.value.length;
      }
    });

    const totalChars = Math.max(this.original.length, this.modified.length);
    return Number(((commonChars / totalChars) * 100).toFixed(1));
  }

  getChangedLineNumbers(): { original: number[], modified: number[] } {
    const changes = diff.diffLines(this.original, this.modified);
    const originalChanged: Set<number> = new Set();
    const modifiedChanged: Set<number> = new Set();
    
    let originalLine = 1;
    let modifiedLine = 1;
    
    changes.forEach(part => {
      const lines = part.value.split(/\r?\n/);
      // If the last line is empty (trailing newline), don't count it as a separate line
      const lineCount = part.value.endsWith('\n') || part.value.endsWith('\r\n') 
        ? lines.length - 1 
        : lines.length;

      if (part.added) {
        for (let i = 0; i < lineCount; i++) {
          modifiedChanged.add(modifiedLine + i);
        }
        modifiedLine += lineCount;
      } else if (part.removed) {
        for (let i = 0; i < lineCount; i++) {
          originalChanged.add(originalLine + i);
        }
        originalLine += lineCount;
      } else {
        originalLine += lineCount;
        modifiedLine += lineCount;
      }
    });
    
    return { 
      original: Array.from(originalChanged).sort((a, b) => a - b), 
      modified: Array.from(modifiedChanged).sort((a, b) => a - b) 
    };
  }

  getCharDiffs(): diff.Change[] {
    return diff.diffChars(this.original, this.modified);
  }

  getDetailedDiff(): diff.Change[] {
    return diff.diffLines(this.original, this.modified);
  }
}

class DifferenceChecker {
  private original: string;
  private modified: string;
  private engine: DiffEngine;

  constructor(original: string, modified: string) {
    this.original = original;
    this.modified = modified;
    this.engine = new DiffEngine(original, modified);
  }

  getReport() {
    const changedLines = this.engine.getChangedLineNumbers();
    return {
      originalStats: TextAnalyzer.getStats(this.original),
      modifiedStats: TextAnalyzer.getStats(this.modified),
      similarity: this.engine.calculateSimilarity(),
      charDiffs: this.engine.getCharDiffs(),
      lineDiffs: this.engine.getDetailedDiff(),
      changedLines
    };
  }
}

// --- UI Components ---

const HighlightedPane = ({ 
  title, 
  value, 
  onChange, 
  diffs, 
  mode,
  isDiffMode,
  changedLines
}: { 
  title: string, 
  value: string, 
  onChange: (val: string) => void, 
  diffs: diff.Change[],
  mode: 'original' | 'modified',
  isDiffMode: boolean,
  changedLines: number[]
}) => {
  const lines = value.split(/\r?\n/);
  const lineNumbers = Array.from({ length: Math.max(lines.length, 1) }, (_, i) => i + 1);
  const lineNumbersRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  return (
    <div className="flex-1 flex flex-col border-r border-zinc-800 last:border-r-0 overflow-hidden shadow-inner">
      <div className={`px-4 py-2 ${mode === 'original' ? 'bg-[#686de0]' : 'bg-[#4834d4]'} border-b border-black/20 text-[10px] font-black uppercase tracking-widest text-white flex justify-between items-center shadow-md z-10`}>
        <span>{title}</span>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-white/30"></div>
          <div className="w-2 h-2 rounded-full bg-white/30"></div>
        </div>
      </div>
      
      <div className={`flex-1 flex relative overflow-hidden ${mode === 'original' ? 'bg-[#34495e]' : 'bg-[#2c3e50]'}`}>
        {/* Line Numbers Column */}
        <div 
          ref={lineNumbersRef}
          className="w-10 bg-black/10 border-r border-white/5 flex flex-col py-4 text-right pr-2 select-none pointer-events-none overflow-hidden"
        >
          {lineNumbers.map(num => {
            const isChanged = changedLines.includes(num);
            return (
              <div 
                key={num} 
                className={`text-[10px] font-mono h-5 leading-5 transition-colors flex-shrink-0 ${
                  isChanged 
                    ? mode === 'original' ? 'bg-red-500/30 text-white font-bold' : 'bg-green-500/30 text-white font-bold'
                    : 'text-white/30'
                }`}
              >
                {num}
              </div>
            );
          })}
          {/* Extra space at bottom to match scroll height */}
          <div className="h-8 flex-shrink-0" />
        </div>

        <div className="flex-1 relative overflow-hidden">
          {!isDiffMode ? (
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onScroll={handleScroll}
              className="absolute inset-0 w-full h-full p-4 pt-4 bg-transparent text-white font-mono text-sm resize-none outline-none leading-5 overflow-auto"
              spellCheck={false}
              style={{ lineHeight: '1.25rem' }}
            />
          ) : (
            <div 
              onScroll={handleScroll}
              className="absolute inset-0 w-full h-full p-4 pt-4 font-mono text-sm text-white overflow-auto whitespace-pre-wrap break-all leading-5"
            >
              {diffs.map((part, i) => {
                if (mode === 'original') {
                  if (part.added) return null;
                  const className = part.removed ? 'bg-red-500/40 text-red-100 border-b border-red-500/50' : '';
                  return <span key={i} className={className}>{part.value}</span>;
                } else {
                  if (part.removed) return null;
                  const className = part.added ? 'bg-green-500/40 text-green-100 border-b border-green-500/50' : '';
                  return <span key={i} className={className}>{part.value}</span>;
                }
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SidebarItem = ({ icon: Icon, label, active = false, badge = "", onClick }: { icon: any, label: string, active?: boolean, badge?: string, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${active ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
  >
    <div className="flex items-center gap-3">
      <Icon size={18} />
      <span className="text-sm font-medium">{label}</span>
    </div>
    {badge && <span className="text-[10px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded uppercase font-bold">{badge}</span>}
  </div>
);

const SidebarSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="mb-6">
    <h3 className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
      <ChevronRight size={10} />
      {title}
    </h3>
    <div className="space-y-1">
      {children}
    </div>
  </div>
);

const StatCard = ({ label, value, subValue, icon: Icon, colorClass = "text-zinc-100" }: { label: string, value: string | number, subValue?: string, icon: any, colorClass?: string }) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col gap-1">
    <div className="flex items-center gap-2 text-zinc-500 mb-1">
      <Icon size={14} />
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </div>
    <div className={`text-xl font-mono font-bold ${colorClass}`}>{value}</div>
    {subValue && <div className="text-[10px] text-zinc-500 font-mono">{subValue}</div>}
  </div>
);

// --- File Processing Logic ---

const extractTextFromFile = async (file: File): Promise<string> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();

  switch (extension) {
    case 'pdf': {
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(' ') + '\n';
      }
      return text;
    }
    case 'docx': {
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    }
    case 'xlsx':
    case 'xls': {
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      let text = '';
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        text += XLSX.utils.sheet_to_txt(worksheet) + '\n';
      });
      return text;
    }
    case 'txt':
    case 'json':
    case 'csv':
    case 'md':
    case 'xml':
    case 'html': {
      return new TextDecoder().decode(arrayBuffer);
    }
    default:
      throw new Error(`Unsupported file type: .${extension}`);
  }
};

const FileDifferenceChecker = ({ onCompare }: { onCompare: (orig: string, mod: string) => void }) => {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    if (!file1 || !file2) return;
    setLoading(true);
    setError(null);
    try {
      const [text1, text2] = await Promise.all([
        extractTextFromFile(file1),
        extractTextFromFile(file2)
      ]);
      onCompare(text1, text2);
    } catch (err: any) {
      setError(err.message || 'Failed to process files');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#111111]">
      <div className="max-w-4xl w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Difference Checker Files</h2>
          <p className="text-zinc-500 text-sm">Upload two files to compare their text content (PDF, Word, Excel, Text, etc.)</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <FileDropZone 
            label="Original File" 
            file={file1} 
            onFileSelect={setFile1} 
            id="file1"
          />
          <FileDropZone 
            label="Modified File" 
            file={file2} 
            onFileSelect={setFile2} 
            id="file2"
          />
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <button
          onClick={handleCompare}
          disabled={!file1 || !file2 || loading}
          className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
            !file1 || !file2 || loading
              ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20'
          }`}
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <RotateCcw size={20} />}
          {loading ? 'Processing Files...' : 'Compare Files'}
        </button>
      </div>
    </div>
  );
};

const FileDropZone = ({ label, file, onFileSelect, id }: { label: string, file: File | null, onFileSelect: (f: File) => void, id: string }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true);
    else setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 ml-1">{label}</span>
      <label 
        htmlFor={id}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
          isDragging ? 'border-blue-500 bg-blue-500/5' : 'border-zinc-800 hover:border-zinc-700 bg-black/20'
        }`}
      >
        <input 
          type="file" 
          id={id} 
          className="hidden" 
          onChange={(e) => e.target.files && onFileSelect(e.target.files[0])}
          accept=".pdf,.docx,.xlsx,.xls,.txt,.json,.csv,.md,.xml,.html"
        />
        <div className={`p-4 rounded-full ${file ? 'bg-green-500/10 text-green-500' : 'bg-zinc-800 text-zinc-500'}`}>
          {file ? <FileText size={32} /> : <FileUp size={32} />}
        </div>
        <div className="text-center px-4">
          <div className="text-sm font-medium text-zinc-300 truncate max-w-[200px]">
            {file ? file.name : 'Click or drag file here'}
          </div>
          <div className="text-[10px] text-zinc-600 mt-1">
            {file ? `${(file.size / 1024).toFixed(1)} KB` : 'PDF, Word, Excel, Text'}
          </div>
        </div>
      </label>
    </div>
  );
};

export default function App() {
  const [activeTool, setActiveTool] = useState<'text' | 'files'>('text');
  const [originalText, setOriginalText] = useState("This is the original text. You can edit it here.");
  const [modifiedText, setModifiedText] = useState("This is the modified text. You can edit it here.");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDiffMode, setIsDiffMode] = useState(false);

  const report = useMemo(() => {
    const checker = new DifferenceChecker(originalText, modifiedText);
    return checker.getReport();
  }, [originalText, modifiedText]);

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans flex overflow-hidden">
      {/* Sidebar ... */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="bg-[#0c0c0c] border-r border-zinc-800 flex-shrink-0 flex flex-col h-screen overflow-y-auto"
      >
        <div className="p-4 flex items-center justify-between border-b border-zinc-800 mb-4">
          <div className="flex items-center gap-2 text-blue-500">
            <Terminal size={24} />
            <span className="font-bold tracking-tight text-white">DEVTOOL+</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="text-zinc-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="px-3 mb-4">
          <div className="bg-zinc-900 rounded-lg px-3 py-2 flex items-center gap-2 text-zinc-500 border border-zinc-800">
            <Search size={14} />
            <input type="text" placeholder="Search tools..." className="bg-transparent border-none outline-none text-xs w-full" />
          </div>
        </div>

        <div className="px-2 flex-1">
          <SidebarSection title="UI Design">
            <SidebarItem icon={Layers} label="Color Mixer" badge="1.0.0" />
          </SidebarSection>
          
          <SidebarSection title="Data">
            <SidebarItem icon={Binary} label="UUID Generator" badge="1.1.0" />
            <SidebarItem icon={Database} label="Data Format Convertor" badge="1.2.0" />
            <SidebarItem icon={FileJson} label="JSON Editor" badge="1.1.0" />
            <SidebarItem icon={FileCode} label="YAML Editor" badge="1.1.0" />
            <SidebarItem icon={Globe} label="HTML / XML Editor" badge="1.1.0" />
            <SidebarItem icon={Calendar} label="Datetime Convertor" badge="1.0.0" />
          </SidebarSection>

          <SidebarSection title="Text">
            <SidebarItem 
              icon={RotateCcw} 
              label="Difference Checker" 
              active={activeTool === 'text'} 
              badge="1.1.0" 
              onClick={() => setActiveTool('text')}
            />
            <SidebarItem 
              icon={FileUp} 
              label="Difference Checker Files" 
              active={activeTool === 'files'} 
              badge="NEW" 
              onClick={() => setActiveTool('files')}
            />
            <SidebarItem icon={LayoutGrid} label="Markdown Table Builder" badge="1.0.0" />
            <SidebarItem icon={Type} label="Lorem Ipsum" badge="1.0.0" />
            <SidebarItem icon={Wand2} label="Slug Generator" badge="1.0.0" />
          </SidebarSection>

          <SidebarSection title="Utility">
            <SidebarItem icon={Hash} label="QR Code Generator" badge="1.0.0" />
            <SidebarItem icon={Globe} label="HTTP Status Code" badge="1.0.0" />
            <SidebarItem icon={Database} label="Data Unit Convertor" badge="1.0.0" />
          </SidebarSection>
        </div>

        <div className="p-4 border-t border-zinc-800 flex items-center justify-between text-zinc-500">
          <Settings size={18} className="cursor-pointer hover:text-white" />
          <Home size={18} className="cursor-pointer hover:text-white" />
          <RotateCcw size={18} className="cursor-pointer hover:text-white" />
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#111111]">
        {/* Header */}
        <header className="p-4 border-b border-zinc-800 flex items-center justify-between bg-[#0c0c0c]">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="text-zinc-500 hover:text-white">
                <Menu size={20} />
              </button>
            )}
            <div>
              <h1 className="text-sm font-bold text-white flex items-center gap-2">
                {activeTool === 'text' ? <RotateCcw size={16} className="text-blue-500" /> : <FileUp size={16} className="text-blue-500" />}
                {activeTool === 'text' ? 'Difference Checker' : 'Difference Checker Files'}
              </h1>
              <p className="text-[10px] text-zinc-500">
                {activeTool === 'text' ? 'Compare two texts to see the differences. Left pane is the original text, right pane is the modified text.' : 'Compare two files for text differences (PDF, Word, Excel, etc.)'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeTool === 'text' && (
              <>
                <button 
                  onClick={() => setIsDiffMode(!isDiffMode)}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all shadow-lg ${isDiffMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-blue-600 text-white hover:bg-blue-500 hover:scale-105 active:scale-95'}`}
                >
                  {isDiffMode ? 'Edit Mode' : 'View Diff'}
                </button>
                <button 
                  onClick={() => { setOriginalText(""); setModifiedText(""); setIsDiffMode(false); }}
                  className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
                >
                  Clear All
                </button>
              </>
            )}
            <button className="p-2 text-zinc-500 hover:text-white bg-zinc-900 rounded-md border border-zinc-800">
              <Settings size={16} />
            </button>
          </div>
        </header>

        {activeTool === 'files' ? (
          <FileDifferenceChecker onCompare={(o, m) => {
            setOriginalText(o);
            setModifiedText(m);
            setIsDiffMode(true);
            setActiveTool('text');
          }} />
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Stats Panel */}
            <div className="w-48 border-r border-zinc-800 p-4 flex flex-col gap-4 bg-[#0c0c0c] overflow-y-auto">
            <StatCard 
              label="Lines" 
              value={`${report.originalStats.lines} → ${report.modifiedStats.lines}`} 
              subValue={
                report.similarity === 100 
                  ? "No changes" 
                  : report.changedLines.modified.length > 0
                    ? `Diff at: ${TextAnalyzer.formatLineNumbers(report.changedLines.modified)}`
                    : "Lines removed"
              }
              icon={Hash} 
            />
            <StatCard 
              label="Words" 
              value={`${report.originalStats.words} → ${report.modifiedStats.words}`} 
              icon={Type} 
            />
            <StatCard 
              label="Characters" 
              value={`${report.originalStats.chars} → ${report.modifiedStats.chars}`} 
              icon={FileText} 
            />
            <StatCard 
              label="Similarity" 
              value={`${report.similarity}%`} 
              icon={Percent} 
              colorClass={report.similarity === 100 ? 'text-green-500' : report.similarity > 50 ? 'text-blue-400' : 'text-amber-500'}
            />
          </div>

          {/* Editor/Diff Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex overflow-hidden">
              <HighlightedPane 
                title="Original Text"
                value={originalText}
                onChange={setOriginalText}
                diffs={report.charDiffs}
                mode="original"
                isDiffMode={isDiffMode}
                changedLines={report.changedLines.original}
              />
              <HighlightedPane 
                title="Modified Text"
                value={modifiedText}
                onChange={setModifiedText}
                diffs={report.charDiffs}
                mode="modified"
                isDiffMode={isDiffMode}
                changedLines={report.changedLines.modified}
              />
            </div>

            {/* Diff View Panel (Line by Line) */}
            <div className="h-1/3 border-t border-zinc-800 flex flex-col bg-[#0c0c0c]">
              <div className="px-4 py-2 bg-zinc-900/50 border-b border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex justify-between items-center">
                <span>Line-by-Line Analysis</span>
                <div className="flex gap-4">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500/30 border border-red-500/50 rounded-sm"></div> Removed</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500/30 border border-green-500/50 rounded-sm"></div> Added</span>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 font-mono text-xs">
                {report.lineDiffs.map((part, index) => {
                  const color = part.added ? 'bg-green-500/10 text-green-400 border-l-2 border-green-500' : 
                                part.removed ? 'bg-red-500/10 text-red-400 border-l-2 border-red-500' : 
                                'text-zinc-500';
                  const prefix = part.added ? '+' : part.removed ? '-' : ' ';
                  
                  return (
                    <div key={index} className={`${color} px-2 py-0.5 whitespace-pre-wrap`}>
                      <span className="opacity-50 mr-2 select-none w-4 inline-block">{prefix}</span>
                      {part.value}
                    </div>
                  );
                })}
              </div>
            </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
