import React, { useState } from 'react';
import { gasFiles } from '../data/gasCodebase';
import { FileCode, Copy, Check, Download, Info, ExternalLink, Terminal, Sparkles } from 'lucide-react';

export default function CodeCenter() {
  const [activeFile, setActiveFile] = useState(gasFiles[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (fileName: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    // Downloads all files sequentially or prints instructions
    gasFiles.forEach(file => {
      handleDownload(file.name, file.content);
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-fade-in" id="code-center">
      {/* Header Panel */}
      <div className="p-6 md:p-8 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Google Apps Script Code Center
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Kode Produksi & Panduan Deploy</h2>
          <p className="text-xs text-slate-400">Salin kode di bawah ini langsung ke editor Google Apps Script Anda.</p>
        </div>
        <button 
          onClick={handleDownloadAll}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-500/10"
        >
          <Download className="w-4 h-4" /> Unduh Semua File ({gasFiles.length} file)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[550px]">
        {/* Sidebar File Explorer */}
        <div className="lg:col-span-3 bg-slate-50 border-r border-slate-100 p-4 space-y-4">
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Struktur File SINS</h4>
            <div className="space-y-1">
              {gasFiles.map((file) => {
                const isActive = activeFile.name === file.name;
                return (
                  <button
                    key={file.name}
                    onClick={() => setActiveFile(file)}
                    className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-left transition-all text-xs font-semibold cursor-pointer ${
                      isActive 
                        ? 'bg-blue-50 text-blue-600 shadow-sm' 
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <FileCode className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-500' : 'text-slate-400'}`} />
                      <span className="truncate">{file.name}</span>
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono ${
                      file.type === 'gs' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {file.type.toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Code Preview Area */}
        <div className="lg:col-span-9 flex flex-col bg-slate-950 text-slate-100 relative">
          
          {/* Editor Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              <span className="ml-2 font-bold text-slate-200">{activeFile.name}</span>
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleCopy}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Tersalin!' : 'Salin Kode'}
              </button>
              <button 
                onClick={() => handleDownload(activeFile.name, activeFile.content)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Unduh File
              </button>
            </div>
          </div>

          {/* Editor Code Textarea */}
          <div className="flex-grow p-6 overflow-auto max-h-[500px]">
            <pre className="font-mono text-xs text-slate-300 leading-relaxed whitespace-pre select-all">
              <code>{activeFile.content}</code>
            </pre>
          </div>

        </div>
      </div>

      {/* Deploy Guidelines Card */}
      <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-100">
        <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 mb-4">
          <Info className="w-4 h-4 text-blue-600" /> 
          Langkah-Langkah Deploy Aplikasi ke Google Apps Script
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600 leading-relaxed font-medium">
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black">1</div>
            <h4 className="font-bold text-slate-800">Buat Project Baru</h4>
            <p>
              Buka <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5 font-bold">script.google.com <ExternalLink className="w-3 h-3" /></a>, klik <strong>New Project</strong>, lalu beri nama project Anda, misalnya <strong>SINS - Sistem Informasi Nilai Siswa</strong>.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black">2</div>
            <h4 className="font-bold text-slate-800">Salin & Tempel File</h4>
            <p>
              Buat file baru di editor Apps Script sesuai dengan nama file di atas. Klik ikon <span className="font-bold text-slate-800">+</span> di samping Files, pilih <strong>Script</strong> untuk file <code>.gs</code> atau <strong>HTML</strong> untuk file <code>.html</code>. Salin kodenya.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black">3</div>
            <h4 className="font-bold text-slate-800">Deploy sebagai Web App</h4>
            <p>
              Klik tombol <strong>Deploy</strong> &gt; <strong>New Deployment</strong>. Pilih jenis <strong>Web App</strong>. Setel <i>Execute as:</i> <strong>Me</strong> dan <i>Who has access:</i> <strong>Anyone</strong> (agar siswa bisa mengakses transkrip nilai tanpa login Google). Klik Deploy!
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
