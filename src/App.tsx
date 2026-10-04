import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import jsQR from "jsqr";
import * as XLSX from "xlsx";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { api, isSupabaseConfigured, type CheckInResponse, type Guest } from "./api";
type Tab = "scan" | "guests" | "cards";
type BarcodeResult = { rawValue: string };
type BarcodeDetectorLike = {
  detect(source: HTMLVideoElement | ImageBitmap): Promise<BarcodeResult[]>;
};
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike;

const icons = {
  scan: <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10" />,
  guests: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
  card: <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-11ZM3 9h18M7 15h4" />,
  camera: <path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3h5ZM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />,
  check: <path d="m5 12 4 4L19 6" />,
  search: <path d="m21 21-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  edit: <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />,
  download: <path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14" />,
  upload: <path d="M12 15V3m0 0 5 5m-5-5-5 5M5 21h14" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  image: <path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5Zm0 11 5-5 4 4 2-2 7 7M16 8h.01" />,
};

function Icon({ name, size = 22 }: { name: keyof typeof icons; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

function formatArrival(value: string | null): string {
  if (!value) return "Belum hadir";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function useQrData(payload: string): string | null {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void QRCode.toDataURL(payload, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 420,
      color: { dark: "#3A101D", light: "#FFF9F3" },
    }).then((value) => {
      if (live) setSrc(value);
    });
    return () => {
      live = false;
    };
  }, [payload]);
  return src;
}

async function downloadGuestCard(guest: Guest, qrSrc: string): Promise<void> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1600;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#FFF9F3";
  ctx.fillRect(0, 0, 1080, 1600);
  ctx.fillStyle = "#6F1730";
  ctx.fillRect(0, 0, 1080, 390);
  ctx.fillStyle = "#C49A56";
  ctx.fillRect(0, 390, 1080, 10);
  ctx.strokeStyle = "#C49A56";
  ctx.lineWidth = 4;
  ctx.strokeRect(32, 32, 1016, 1536);
  ctx.textAlign = "center";
  ctx.fillStyle = "#EED8C4";
  ctx.font = "30px Avenir Next, sans-serif";
  ctx.fillText("THE WEDDING OF", 540, 105);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 72px Georgia, serif";
  ctx.fillText("Estrisantya", 540, 205);
  ctx.fillStyle = "#C49A56";
  ctx.font = "italic 46px Georgia, serif";
  ctx.fillText("&", 540, 270);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 72px Georgia, serif";
  ctx.fillText("Idham", 540, 352);
  ctx.fillStyle = "#6F1730";
  ctx.font = "bold 34px Avenir Next, sans-serif";
  ctx.fillText("KARTU AKSES TAMU", 540, 495);
  ctx.fillStyle = "#92777D";
  ctx.font = "24px Avenir Next, sans-serif";
  ctx.fillText("NAMA", 540, 590);
  ctx.fillStyle = "#3A101D";
  ctx.font = "bold 55px Georgia, serif";
  ctx.fillText(guest.name, 540, 665);
  ctx.fillStyle = "#92777D";
  ctx.font = "24px Avenir Next, sans-serif";
  ctx.fillText("ASAL / INSTANSI", 540, 740);
  ctx.fillStyle = "#3A101D";
  ctx.font = "36px Avenir Next, sans-serif";
  ctx.fillText(guest.origin, 540, 800);
  const image = new Image();
  image.src = qrSrc;
  await image.decode();
  ctx.drawImage(image, 340, 865, 400, 400);
  ctx.fillStyle = "#6F1730";
  ctx.font = "bold 26px Avenir Next, sans-serif";
  ctx.fillText(guest.card_code, 540, 1328);
  ctx.fillStyle = "#92777D";
  ctx.font = "25px Avenir Next, sans-serif";
  ctx.fillText("Tunjukkan dan scan QR ini saat tiba", 540, 1405);
  ctx.fillStyle = "#C49A56";
  ctx.fillRect(300, 1462, 170, 3);
  ctx.fillRect(610, 1462, 170, 3);
  ctx.font = "36px Georgia, serif";
  ctx.fillText("♥", 540, 1475);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `kartu-${guest.name.toLocaleLowerCase("id-ID").replace(/[^a-z0-9]+/g, "-")}.png`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function WeddingMark() {
  return (
    <div className="wedding-mark" aria-label="Pernikahan Estrisantya dan Idham">
      <span>Estrisantya</span><i>&</i><span>Idham</span>
    </div>
  );
}

function decodeQrWithJsQr(
  source: HTMLVideoElement | ImageBitmap,
  maxSize: number,
): string | null {
  const srcW = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
  const srcH = source instanceof HTMLVideoElement ? source.videoHeight : source.height;
  if (!srcW || !srcH) return null;
  const scale = Math.min(1, maxSize / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const code = jsQR(imageData.data, w, h, { inversionAttempts: "attemptBoth" });
  return code?.data ?? null;
}

function Scanner({ onScanned, busy }: { onScanned: (payload: string) => void; busy: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeRef = useRef(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  const stop = () => {
    activeRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setActive(false);
  };

  useEffect(() => stop, []);

  const start = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Kamera tidak tersedia di browser ini. Gunakan unggah gambar atau masukkan kode kartu.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      activeRef.current = true;
      setActive(true);
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      // BarcodeDetector (cepat) kalau didukung browser; kalau tidak, pakai
      // jsQR sebagai fallback universal supaya kamera tetap jalan di semua browser.
      const Detector = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
      const detector = Detector ? new Detector({ formats: ["qr_code"] }) : null;
      const loop = async () => {
        if (!activeRef.current || busy) return;
        try {
          let value: string | null = null;
          if (video.readyState >= 2) {
            if (detector) {
              const results = await detector.detect(video);
              value = results[0]?.rawValue ?? null;
            } else {
              value = decodeQrWithJsQr(video, 640);
            }
          }
          if (value) {
            stop();
            navigator.vibrate?.(80);
            onScanned(value);
            return;
          }
        } catch {
          // A transient decode miss is expected while the card is moving.
        }
        window.setTimeout(() => void loop(), detector ? 420 : 600);
      };
      void loop();
    } catch {
      stop();
      setError("Kamera tidak dapat dibuka. Izinkan akses kamera, atau gunakan pilihan lain di bawah.");
    }
  };

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const bitmap = await createImageBitmap(file);
      let value: string | null = null;
      const Detector = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
      if (Detector) {
        const results = await new Detector({ formats: ["qr_code"] }).detect(bitmap);
        value = results[0]?.rawValue ?? null;
      } else {
        value = decodeQrWithJsQr(bitmap, 1000);
      }
      bitmap.close();
      if (!value) {
        setError("QR belum terbaca. Coba gambar yang lebih terang dan tidak terpotong.");
        return;
      }
      onScanned(value);
    } catch {
      setError("Gambar QR tidak dapat dibaca.");
    }
  };

  const submitManual = (event: FormEvent) => {
    event.preventDefault();
    if (manual.trim()) onScanned(manual.trim());
  };

  return (
    <section className={`scanner-shell ${active ? "is-active" : ""}`} aria-label="Pemindai kartu tamu">
      <div className="scan-corners" aria-hidden="true"><span /><span /><span /><span /></div>
      {active ? (
        <>
          <video ref={videoRef} className="camera-feed" playsInline muted aria-label="Tampilan kamera pemindai QR" />
          <div className="scan-line" aria-hidden="true" />
          <button className="camera-stop" onClick={stop}>Hentikan kamera</button>
        </>
      ) : (
        <div className="scanner-empty">
          <div className="camera-medallion"><Icon name="camera" size={30} /></div>
          <h2>Arahkan kartu ke kamera</h2>
          <p>QR akan terbaca otomatis dan kehadiran langsung tercatat.</p>
          <button className="primary-button" onClick={() => void start()} disabled={busy}>
            <Icon name="camera" size={19} /> Mulai kamera
          </button>
        </div>
      )}
      {busy && <div className="scan-busy"><span className="spinner" /> Memeriksa kartu…</div>}
      {error && <p className="inline-error" role="alert">{error}</p>}
      <div className="scanner-fallbacks">
        <label className="quiet-button file-button">
          <Icon name="image" size={18} /> Pilih gambar QR
          <input aria-label="Pilih gambar QR" type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void pickImage(file); }} />
        </label>
        <form onSubmit={submitManual} className="manual-form">
          <input aria-label="Kode kartu" value={manual} onChange={(event) => setManual(event.target.value)} placeholder="Kode kartu" />
          <button aria-label="Periksa kode kartu" disabled={!manual.trim() || busy}>Periksa</button>
        </form>
      </div>
    </section>
  );
}

function ResultPanel({ result, onClose }: { result: CheckInResponse; onClose: () => void }) {
  const guest = result.guest;
  const found = guest !== null;
  return (
    <div className="result-overlay" role="dialog" aria-modal="true" aria-label="Hasil pemindaian">
      <div className={`result-panel ${found ? "success" : "error"}`}>
        <div className="result-icon">{found ? <Icon name="check" size={34} /> : <Icon name="close" size={32} />}</div>
        <p className="result-kicker">{result.status === "checked_in" ? "Kehadiran tercatat" : result.status === "already_present" ? "Sudah tercatat" : "Kartu tidak ditemukan"}</p>
        <h2>{guest?.name ?? "QR belum dikenali"}</h2>
        <p>{guest ? guest.origin : "Pastikan QR berasal dari kartu akses acara ini."}</p>
        {guest?.attended_at && <time>{formatArrival(guest.attended_at)}</time>}
        <button className="primary-button" onClick={onClose}>{found ? "Scan tamu berikutnya" : "Coba lagi"}</button>
      </div>
    </div>
  );
}

function GuestForm({ guest, onClose }: { guest?: Guest; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(guest?.name ?? "");
  const [origin, setOrigin] = useState(guest?.origin ?? "");
  const save = useMutation({
    mutationFn: () => guest ? api.updateGuest({ id: guest.id, name, origin }) : api.createGuest({ name, origin }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["guests"] });
      onClose();
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim() && origin.trim()) save.mutate();
  };
  return (
    <div className="sheet-overlay" role="dialog" aria-modal="true" aria-label={guest ? "Edit tamu" : "Tambah tamu"}>
      <form className="bottom-sheet" onSubmit={submit}>
        <div className="sheet-heading">
          <div><p>{guest ? "Perbarui kartu" : "Kartu baru"}</p><h2>{guest ? "Edit data tamu" : "Tambah tamu"}</h2></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Tutup"><Icon name="close" /></button>
        </div>
        <label>Nama tamu<input aria-label="Nama tamu" value={name} onChange={(event) => setName(event.target.value)} autoFocus /></label>
        <label>Asal / instansi<input aria-label="Asal atau instansi" value={origin} onChange={(event) => setOrigin(event.target.value)} /></label>
        {save.isError && <p className="inline-error">Data belum tersimpan. Coba lagi.</p>}
        <button className="primary-button" type="submit" disabled={!name.trim() || !origin.trim() || save.isPending}>{save.isPending ? "Menyimpan…" : "Simpan tamu"}</button>
      </form>
    </div>
  );
}

type ParsedGuest = { name: string; origin: string };

const NAME_HEADERS = ["nama", "name", "nama tamu", "guest", "guest name"];
const ORIGIN_HEADERS = ["asal", "origin", "asal instansi", "asal/instansi", "instansi", "dari", "alamat", "kota"];

function parseExcelFile(file: File): Promise<{ guests: ParsedGuest[]; skipped: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const wb = XLSX.read(reader.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        if (!ws) throw new Error("empty");
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
        if (rows.length === 0) throw new Error("empty");
        const headers = Object.keys(rows[0]);
        const norm = (s: string) => s.toLocaleLowerCase("id-ID").trim().replace(/[_\s/]+/g, " ");
        const nameKey = headers.find((h) => NAME_HEADERS.includes(norm(h)));
        const originKey = headers.find((h) => ORIGIN_HEADERS.includes(norm(h)));
        if (!nameKey) throw new Error("noheader");
        const guests: ParsedGuest[] = [];
        let skipped = 0;
        for (const row of rows) {
          const name = String(row[nameKey] ?? "").trim();
          if (!name) { skipped++; continue; }
          const origin = originKey ? String(row[originKey] ?? "").trim() : "";
          guests.push({ name, origin: origin || "-" });
        }
        resolve({ guests, skipped });
      } catch {
        reject(new Error("parse"));
      }
    };
    reader.onerror = () => reject(new Error("read"));
    reader.readAsArrayBuffer(file);
  });
}

function downloadTemplate() {
  const ws = XLSX.utils.json_to_sheet([
    { Nama: "Contoh Tamu", Asal: "Jakarta" },
    { Nama: "Tamu Kedua", Asal: "Bandung" },
  ]);
  ws["!cols"] = [{ wch: 24 }, { wch: 24 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tamu");
  XLSX.writeFile(wb, "template-buku-tamu.xlsx");
}

function ImportExcel({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParsedGuest[] | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const importMutation = useMutation({
    mutationFn: (guests: ParsedGuest[]) => api.importGuests(guests),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ["guests"] });
      setDone(res.count);
    },
  });

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setDone(null);
    setParsing(true);
    try {
      const { guests, skipped: skippedRows } = await parseExcelFile(file);
      if (guests.length === 0) {
        setError("Tidak ada data tamu yang valid. Pastikan file punya kolom Nama.");
        setPreview(null);
      } else {
        setFileName(file.name);
        setPreview(guests);
        setSkipped(skippedRows);
      }
    } catch {
      setError("File tidak bisa dibaca. Pakai .xlsx / .xls / .csv dengan kolom Nama dan Asal.");
      setPreview(null);
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="sheet-overlay" role="dialog" aria-modal="true" aria-label="Import tamu dari Excel">
      <div className="bottom-sheet import-sheet">
        <div className="sheet-heading">
          <div><p>Tambah banyak sekaligus</p><h2>Import Excel</h2></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Tutup"><Icon name="close" /></button>
        </div>
        {done !== null ? (
          <div className="import-done">
            <div className="result-icon"><Icon name="check" size={34} /></div>
            <h3>{done} tamu berhasil ditambahkan!</h3>
            <p>Kartu aksesnya langsung jadi dan bisa dilihat di tab Kartu.</p>
            <button className="primary-button" onClick={onClose}>Tutup</button>
          </div>
        ) : (
          <>
            <p className="import-hint">File Excel harus punya kolom <b>Nama</b> dan <b>Asal</b> di baris pertama. Belum punya filenya? Unduh templatenya dulu.</p>
            <div className="import-actions">
              <label className="quiet-button file-pick">
                <Icon name="upload" size={18} /> Pilih file
                <input type="file" accept=".xlsx,.xls,.csv" aria-label="Pilih file Excel" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void pickFile(file); }} />
              </label>
              <button className="quiet-button" onClick={downloadTemplate}><Icon name="download" size={18} /> Template</button>
            </div>
            {parsing && <p className="import-status"><span className="spinner" /> Membaca file…</p>}
            {error && <p className="inline-error" role="alert">{error}</p>}
            {preview && (
              <>
                <p className="import-status"><b>{preview.length}</b> tamu siap diimport{skipped > 0 ? ` (${skipped} baris kosong dilewati)` : ""} dari <i>{fileName}</i></p>
                <ul className="import-preview">
                  {preview.slice(0, 5).map((guest, i) => <li key={i}><b>{guest.name}</b><span>{guest.origin}</span></li>)}
                  {preview.length > 5 && <li className="more">+ {preview.length - 5} tamu lainnya…</li>}
                </ul>
                <button className="primary-button import-submit" disabled={importMutation.isPending} onClick={() => importMutation.mutate(preview)}>
                  {importMutation.isPending ? "Mengimport…" : `Import ${preview.length} tamu`}
                </button>
                {importMutation.isError && <p className="inline-error">Import gagal. Coba lagi.</p>}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function GuestList({ guests }: { guests: Guest[] }) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "present" | "waiting">("all");
  const [editing, setEditing] = useState<Guest | "new" | null>(null);
  const [importing, setImporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Guest | null>(null);
  const attendance = useMutation({
    mutationFn: (input: { id: number; present: boolean }) => api.setAttendance(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guests"] }),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.deleteGuest({ id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["guests"] });
      setDeleteTarget(null);
    },
  });
  const filtered = useMemo(() => guests.filter((guest) => {
    const matchesText = `${guest.name} ${guest.origin}`.toLocaleLowerCase("id-ID").includes(query.toLocaleLowerCase("id-ID"));
    const matchesStatus = filter === "all" || (filter === "present" ? guest.attended_at !== null : guest.attended_at === null);
    return matchesText && matchesStatus;
  }), [filter, guests, query]);

  return (
    <section className="content-section">
      <div className="section-heading">
        <div><p>Daftar undangan</p><h2>Tamu & kehadiran</h2></div>
        <div className="heading-actions">
          <button className="quiet-button import-button" onClick={() => setImporting(true)}><Icon name="upload" size={18} /> Excel</button>
          <button className="add-button" onClick={() => setEditing("new")}><Icon name="plus" size={19} /> Tambah</button>
        </div>
      </div>
      <label className="search-box"><Icon name="search" size={19} /><input aria-label="Cari tamu" placeholder="Cari nama atau asal" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <div className="filter-row" aria-label="Filter kehadiran">
        {(["all", "present", "waiting"] as const).map((value) => (
          <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value === "all" ? "Semua" : value === "present" ? "Hadir" : "Belum"}</button>
        ))}
      </div>
      <div className="guest-list">
        {filtered.map((guest) => (
          <article className="guest-row" key={guest.id}>
            <button className={`presence-toggle ${guest.attended_at ? "present" : ""}`} aria-label={`${guest.attended_at ? "Batalkan kehadiran" : "Tandai hadir"} ${guest.name}`} onClick={() => attendance.mutate({ id: guest.id, present: !guest.attended_at })}>
              {guest.attended_at ? <Icon name="check" size={18} /> : <span />}
            </button>
            <div className="guest-main"><h3>{guest.name}</h3><p>{guest.origin}</p><small>{formatArrival(guest.attended_at)}</small></div>
            <button className="icon-button" onClick={() => setEditing(guest)} aria-label={`Edit ${guest.name}`}><Icon name="edit" size={18} /></button>
            <button className="text-delete" onClick={() => setDeleteTarget(guest)} aria-label={`Hapus ${guest.name}`}>Hapus</button>
          </article>
        ))}
        {filtered.length === 0 && <div className="empty-state"><p>Tidak ada tamu yang cocok.</p><span>Coba kata lain atau ubah filter.</span></div>}
      </div>
      {editing && <GuestForm guest={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
      {importing && <ImportExcel onClose={() => setImporting(false)} />}
      {deleteTarget && (
        <div className="sheet-overlay" role="dialog" aria-modal="true" aria-label="Hapus tamu">
          <div className="confirm-sheet"><h2>Hapus {deleteTarget.name}?</h2><p>Kartu aksesnya tidak akan bisa dipakai lagi.</p><div><button className="quiet-button" onClick={() => setDeleteTarget(null)}>Batal</button><button className="danger-button" onClick={() => remove.mutate(deleteTarget.id)}>{remove.isPending ? "Menghapus…" : "Hapus"}</button></div></div>
        </div>
      )}
    </section>
  );
}

function GuestCard({ guest }: { guest: Guest }) {
  const qr = useQrData(guest.qr_payload);
  return (
    <article className="access-card">
      <div className="card-top"><p>THE WEDDING OF</p><h3>Estrisantya <i>&</i> Idham</h3></div>
      <div className="card-body"><span>KARTU AKSES TAMU</span><h4>{guest.name}</h4><p>{guest.origin}</p>{qr ? <img src={qr} alt={`QR akses untuk ${guest.name}`} /> : <div className="qr-placeholder" /> }<code>{guest.card_code}</code></div>
      <button className="download-button" disabled={!qr} onClick={() => qr && void downloadGuestCard(guest, qr)}><Icon name="download" size={19} /> Unduh kartu PNG</button>
    </article>
  );
}

function CardsView({ guests }: { guests: Guest[] }) {
  return (
    <section className="content-section">
      <div className="section-heading"><div><p>Siap dibagikan</p><h2>Kartu akses</h2></div></div>
      <p className="section-intro">Setiap QR terhubung ke satu tamu. Unduh kartunya lalu kirim atau cetak sesuai kebutuhan.</p>
      <div className="cards-grid">{guests.map((guest) => <GuestCard key={guest.id} guest={guest} />)}</div>
    </section>
  );
}

function Stat({ value, label, tone }: { value: number; label: string; tone?: "green" }) {
  return <div className={`stat ${tone ?? ""}`}><strong>{value}</strong><span>{label}</span></div>;
}

function ScreenState({ children }: { children: ReactNode }) {
  return <main className="state-screen">{children}</main>;
}

export function App() {
  if (!isSupabaseConfigured) {
    return (
      <ScreenState>
        <h2>Database belum dihubungkan</h2>
        <p>
          Salin file .env.example menjadi .env, isi VITE_SUPABASE_URL dan
          VITE_SUPABASE_ANON_KEY dari dashboard Supabase, lalu jalankan
          supabase/schema.sql di SQL Editor. Panduan lengkap ada di README.
        </p>
      </ScreenState>
    );
  }
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("scan");
  const [result, setResult] = useState<CheckInResponse | null>(null);
  const guestsQuery = useQuery({ queryKey: ["guests"], queryFn: () => api.listGuests({}) });
  const checkIn = useMutation({
    mutationFn: (payload: string) => api.checkInGuest({ payload }),
    onSuccess: async (data) => {
      setResult(data);
      await queryClient.invalidateQueries({ queryKey: ["guests"] });
    },
  });

  if (guestsQuery.isPending) return <ScreenState><span className="spinner large" /><p>Menyiapkan daftar tamu…</p></ScreenState>;
  if (guestsQuery.isError) return <ScreenState><h2>Daftar belum dapat dibuka</h2><p>Periksa koneksi lalu coba lagi.</p><button className="primary-button" onClick={() => void guestsQuery.refetch()}>Coba lagi</button></ScreenState>;

  const { guests, total, present } = guestsQuery.data;
  return (
    <div className="app-shell">
      <header className="event-header">
        <WeddingMark />
        <div className="attendance-summary"><Stat value={present} label="sudah hadir" tone="green" /><span /><Stat value={total - present} label="belum tiba" /></div>
      </header>

      <main className="main-content">
        {tab === "scan" && (
          <div className="scan-layout">
            <div>
              <p className="page-kicker">Selamat datang</p>
              <h1>Scan kartu aksesmu</h1>
              <p className="lead">Hadapkan QR pada kartu ke kamera. Namamu akan langsung ditandai hadir.</p>
              <Scanner onScanned={(payload) => checkIn.mutate(payload)} busy={checkIn.isPending} />
              {checkIn.isError && <p className="inline-error">Kartu belum bisa diperiksa. Coba sekali lagi.</p>}
            </div>
            <aside className="today-panel">
              <p>Kehadiran hari ini</p>
              <strong>{present}<small> / {total}</small></strong>
              <div className="progress-track"><span style={{ width: `${total ? Math.round((present / total) * 100) : 0}%` }} /></div>
              <p>{total ? Math.round((present / total) * 100) : 0}% tamu sudah tiba</p>
            </aside>
          </div>
        )}
        {tab === "guests" && <GuestList guests={guests} />}
        {tab === "cards" && <CardsView guests={guests} />}
      </main>

      <nav className="bottom-nav" aria-label="Navigasi utama">
        <button className={tab === "scan" ? "active" : ""} onClick={() => setTab("scan")}><Icon name="scan" /><span>Scan</span></button>
        <button className={tab === "guests" ? "active" : ""} onClick={() => setTab("guests")}><Icon name="guests" /><span>Tamu</span></button>
        <button className={tab === "cards" ? "active" : ""} onClick={() => setTab("cards")}><Icon name="card" /><span>Kartu</span></button>
      </nav>
      {result && <ResultPanel result={result} onClose={() => setResult(null)} />}
    </div>
  );
}
