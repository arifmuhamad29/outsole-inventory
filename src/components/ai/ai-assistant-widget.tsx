"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  KeyRound,
  Bot,
  User,
  Database,
  ExternalLink,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Cpu,
} from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  toolsUsed?: string[]
  timestamp: string
}

interface GeminiModelItem {
  id: string
  name: string
  displayName: string
  description?: string
}

export function AiAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // API Key & Model Configuration
  const [showSettings, setShowSettings] = useState(false)
  const [customKey, setCustomKey] = useState("")
  const [savedKey, setSavedKey] = useState<string | null>(null)

  // Model pulling state
  const [modelsList, setModelsList] = useState<GeminiModelItem[]>([])
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.0-flash")
  const [savedModel, setSavedModel] = useState<string>("gemini-2.0-flash")
  const [isPullingModels, setIsPullingModels] = useState(false)
  const [pullStatus, setPullStatus] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load configuration from localStorage on mount
  useEffect(() => {
    try {
      const storedKey = localStorage.getItem("GEMINI_USER_API_KEY")
      const storedModel = localStorage.getItem("GEMINI_SELECTED_MODEL")
      if (storedKey) {
        setSavedKey(storedKey)
        setCustomKey(storedKey)
      }
      if (storedModel) {
        setSavedModel(storedModel)
        setSelectedModel(storedModel)
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen, messages, isLoading])

  // Suggested prompt pills
  const samplePrompts = [
    "Berapa stok outsole model 603 warna white 5t?",
    "Tampilkan outsole yang low stock hari ini",
    "Berapa total SKU dan total stok saat ini?",
    "Cari artikel 9DJ",
  ]

  // Step 1: Pull Models from Google using the entered API key
  const handlePullModels = async () => {
    const keyToTest = customKey.trim() || savedKey?.trim()
    if (!keyToTest) {
      setPullStatus({
        type: "error",
        message: "Silakan masukkan Kunci API Gemini Anda terlebih dahulu.",
      })
      return
    }

    setIsPullingModels(true)
    setPullStatus(null)

    try {
      const res = await fetch("/api/ai/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: keyToTest }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setPullStatus({
          type: "error",
          message: data.message || "Gagal menarik daftar model. Periksa kembali API Key.",
        })
        return
      }

      const models: GeminiModelItem[] = data.models || []
      setModelsList(models)

      if (models.length > 0) {
        // Automatically default to gemini-2.0-flash or gemini-1.5-flash if available
        const preferred =
          models.find((m) => m.id.includes("2.0-flash")) ||
          models.find((m) => m.id.includes("1.5-flash")) ||
          models[0]

        setSelectedModel(preferred.id)
        setPullStatus({
          type: "success",
          message: `Berhasil terhubung! Ditemukan ${models.length} model aktif dari Google AI.`,
        })
      } else {
        setPullStatus({
          type: "error",
          message: "Tidak ditemukan model yang mendukung generateContent untuk kunci ini.",
        })
      }
    } catch {
      setPullStatus({
        type: "error",
        message: "Tidak dapat menghubungi server untuk menarik model. Cek koneksi Anda.",
      })
    } finally {
      setIsPullingModels(false)
    }
  }

  // Step 2: Save the verified key and selected model
  const handleSaveConfiguration = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customKey.trim() && !savedKey) {
      setPullStatus({
        type: "error",
        message: "API Key belum diisi.",
      })
      return
    }

    const keyToSave = customKey.trim() || savedKey || ""
    localStorage.setItem("GEMINI_USER_API_KEY", keyToSave)
    localStorage.setItem("GEMINI_SELECTED_MODEL", selectedModel)

    setSavedKey(keyToSave)
    setSavedModel(selectedModel)
    setShowSettings(false)
    setPullStatus(null)
  }

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim()
    if (!text || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    // Build history for multi-turn context
    const historyPayload = messages.slice(-6).map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("model" as const),
      parts: [{ text: m.content }],
    }))

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          customApiKey: savedKey || undefined,
          selectedModel: savedModel || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        // If error indicates missing or invalid key, open settings automatically
        if (data.message && (data.message.includes("GEMINI_API_KEY") || data.message.includes("API key"))) {
          setShowSettings(true)
        }

        const errorMessage: Message = {
          id: `assistant-err-${Date.now()}`,
          role: "assistant",
          content: `⚠️ **Gagal:** ${data.message || "Terjadi kesalahan saat memproses pertanyaan."}`,
          timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        }
        setMessages((prev) => [...prev, errorMessage])
        return
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        toolsUsed: data.toolsUsed,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch {
      const errorMessage: Message = {
        id: `assistant-err-${Date.now()}`,
        role: "assistant",
        content: "⚠️ **Koneksi Terputus:** Tidak dapat menghubungi server asisten AI.",
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearChat = () => {
    setMessages([])
  }

  // Simple formatter for assistant markdown text
  const renderFormattedContent = (content: string) => {
    const lines = content.split("\n")
    return lines.map((line, idx) => {
      // Bold formatter: **text**
      const parts = line.split(/(\*\*[^*]+\*\*)/g)
      const formattedLine = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={pIdx} className="font-semibold text-foreground">
              {part.slice(2, -2)}
            </strong>
          )
        }
        // Inline code `code`
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={pIdx}
              className="px-1 py-0.5 rounded bg-muted text-xs font-mono font-medium"
            >
              {part.slice(1, -1)}
            </code>
          )
        }
        return part
      })

      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <li key={idx} className="ml-4 list-disc text-xs sm:text-sm">
            {formattedLine}
          </li>
        )
      }

      if (line.trim() === "") {
        return <div key={idx} className="h-1.5" />
      }

      return (
        <p key={idx} className="text-xs sm:text-sm leading-relaxed">
          {formattedLine}
        </p>
      )
    })
  }

  return (
    <div className="print:hidden">
      {/* Floating Action Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 h-12 px-4 rounded-full shadow-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium flex items-center gap-2 border border-white/20 transition-all transform hover:scale-105 active:scale-95"
          title="Buka Asisten AI Gudang"
        >
          <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
          <span className="text-sm font-semibold tracking-wide">Tanya AI</span>
          <Badge
            variant="secondary"
            className="ml-1 text-[10px] h-4.5 px-1.5 py-0 bg-white/20 text-white border-0 font-mono font-bold"
          >
            {savedModel.replace("gemini-", "").replace("-preview", "")}
          </Badge>
        </Button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-[94vw] sm:w-[440px] md:w-[480px] h-[600px] max-h-[88vh] bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-900/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center shadow-md">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm leading-none">Asisten Gudang AI</span>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 h-4 border-indigo-400/40 text-indigo-300 font-mono"
                  >
                    {savedModel}
                  </Badge>
                  <span className="text-[10px] text-slate-400">• Database Connected</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(!showSettings)}
                className={`h-7 w-7 text-slate-400 hover:text-white hover:bg-white/10 ${
                  showSettings ? "bg-white/15 text-white" : ""
                }`}
                title="Konfigurasi API Key & Model"
              >
                <KeyRound className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearChat}
                className="h-7 w-7 text-slate-400 hover:text-white hover:bg-white/10"
                title="Hapus Percakapan"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 text-slate-400 hover:text-white hover:bg-white/10"
                title="Tutup Asisten"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Settings Drawer (Step 1: Input Key -> Step 2: Tarik Model -> Step 3: Pilih Model) */}
          {showSettings && (
            <div className="p-3.5 bg-slate-50 dark:bg-gray-800/90 border-b border-slate-200 dark:border-gray-700 text-xs space-y-3 animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between font-semibold text-foreground">
                <span className="flex items-center gap-1.5 text-xs">
                  <KeyRound className="w-4 h-4 text-primary" />
                  Konfigurasi Kunci API & Pemilihan Model
                </span>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Step 1: Input API Key & Tarik Model */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
                  <span>1. Masukkan API Key Gemini:</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                  >
                    Dapatkan Kunci Gratis <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="AIzaSy..."
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    className="h-8 text-xs bg-white dark:bg-gray-900 font-mono"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handlePullModels}
                    disabled={isPullingModels || (!customKey.trim() && !savedKey)}
                    className="h-8 text-xs px-3 shrink-0 whitespace-nowrap bg-primary"
                  >
                    {isPullingModels ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        Menarik...
                      </>
                    ) : (
                      <>
                        <Cpu className="w-3.5 h-3.5 mr-1" />
                        Tarik Model
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Status Banner */}
              {pullStatus && (
                <div
                  className={`p-2 rounded-md text-[11px] flex items-start gap-1.5 ${
                    pullStatus.type === "success"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
                  }`}
                >
                  {pullStatus.type === "success" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                  )}
                  <span>{pullStatus.message}</span>
                </div>
              )}

              {/* Step 2: Choose from Pulled Models */}
              {modelsList.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-gray-700">
                  <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <span>2. Pilih Model yang Akan Digunakan:</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      {modelsList.length} Model Tersedia
                    </Badge>
                  </label>
                  <Select value={selectedModel} onValueChange={(val) => val && setSelectedModel(val)}>
                    <SelectTrigger className="h-8 text-xs bg-white dark:bg-gray-900 w-full">
                      <SelectValue placeholder="Pilih model Gemini..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {modelsList.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-xs">
                          <div className="flex flex-col">
                            <span className="font-semibold">{m.displayName || m.id}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {m.id}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveConfiguration}
                      className="h-8 text-xs px-4"
                    >
                      Simpan & Terapkan Model
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-gray-950/40">
            {/* Initial Welcome message if empty */}
            {messages.length === 0 && (
              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-2.5 bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm">
                  <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="space-y-1 text-xs sm:text-sm">
                    <p className="font-semibold text-foreground">
                      Halo! Saya Asisten Inventaris Anda. 👋
                    </p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Saya terhubung langsung ke database untuk menjawab kueri stok outsole,
                      artikel, warna, ukuran, dan mutasi secara akurat.
                    </p>
                  </div>
                </div>

                {/* Suggested prompt chips */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Coba tanyakan:
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {samplePrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(prompt)}
                        className="text-left text-xs px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-slate-300 hover:border-primary hover:text-primary transition-all flex items-center justify-between group shadow-2xs"
                      >
                        <span>{prompt}</span>
                        <ChevronDown className="w-3.5 h-3.5 -rotate-90 opacity-40 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Render Chat Messages */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm shadow-2xs ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-xs"
                      : "bg-white dark:bg-gray-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-gray-700 rounded-bl-xs"
                  }`}
                >
                  <div className="space-y-1">
                    {msg.role === "assistant"
                      ? renderFormattedContent(msg.content)
                      : msg.content}
                  </div>

                  {/* Tools used pill badge */}
                  {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-gray-700/60 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                      <Database className="w-3 h-3 text-primary" />
                      <span>Data:</span>
                      {msg.toolsUsed.map((tool) => (
                        <span
                          key={tool}
                          className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-gray-700 font-mono text-[9px] text-slate-700 dark:text-slate-300"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  )}

                  <span
                    className={`block text-[9px] mt-1 text-right ${
                      msg.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>

                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-md bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-2.5 items-start">
                <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-2xl rounded-bl-xs px-4 py-3 shadow-2xs flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 rounded-full bg-primary animate-bounce"></span>
                  </div>
                  <span className="ml-1 text-[11px]">Memeriksa database inventaris...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white dark:bg-gray-900 border-t border-slate-200 dark:border-gray-800">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="flex items-center gap-2"
            >
              <Input
                ref={inputRef}
                placeholder="Tanyakan stok, artikel, atau mutasi..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                className="h-10 text-xs sm:text-sm bg-slate-50 dark:bg-gray-950 border-slate-200 dark:border-gray-800"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !inputValue.trim()}
                className="h-10 w-10 shrink-0 bg-primary hover:bg-primary/90"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
            <div className="text-[10px] text-center text-muted-foreground mt-1.5 flex items-center justify-center gap-2">
              <span>Model: <strong className="font-mono text-foreground">{savedModel}</strong></span>
              <span>•</span>
              <span>Akses database aman (read-only)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
