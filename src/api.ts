import { supabase, isSupabaseConfigured } from "./supabase";

export { isSupabaseConfigured };

export type Guest = {
  id: number;
  name: string;
  origin: string;
  card_code: string;
  qr_payload: string;
  attended_at: string | null;
};

export type ListGuestsResponse = {
  guests: Guest[];
  total: number;
  present: number;
};

export type CheckInResponse = {
  status: "checked_in" | "already_present" | "not_found";
  guest: Guest | null;
};

/** Bentuk baris mentah dari tabel `guests` (kolom snake_case). */
type GuestRow = {
  id: number;
  name: string;
  origin: string;
  card_code: string;
  qr_payload: string;
  attended_at: string | null;
  created_at: string;
  updated_at: string;
};

function ensureConfigured(): void {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase belum dikonfigurasi");
  }
}

function serializeGuest(row: GuestRow): Guest {
  return {
    id: row.id,
    name: row.name,
    origin: row.origin,
    card_code: row.card_code,
    qr_payload: row.qr_payload,
    attended_at: row.attended_at ? new Date(row.attended_at).toISOString() : null,
  };
}

function normalize(value: string): string {
  return value.replace(/\r\n/g, "\n").trim().toLocaleLowerCase("id-ID");
}

export const api = {
  async listGuests(_args: Record<string, never>): Promise<ListGuestsResponse> {
    ensureConfigured();
    const { data, error } = await supabase
      .from("guests")
      .select("*")
      .order("id", { ascending: true });
    if (error) throw error;
    const guests = (data as GuestRow[]).map(serializeGuest);
    return {
      guests,
      total: guests.length,
      present: guests.filter((guest) => guest.attended_at !== null).length,
    };
  },

  async checkInGuest({ payload }: { payload: string }): Promise<CheckInResponse> {
    ensureConfigured();
    const { data, error } = await supabase.from("guests").select("*");
    if (error) throw error;
    const rows = data as GuestRow[];
    const scanned = normalize(payload).replace(/^buku-tamu:/, "");
    const match = rows.find((row) => {
      const qrPayload = normalize(row.qr_payload);
      const code = normalize(row.card_code);
      return scanned === qrPayload || scanned === code;
    });
    if (!match) return { status: "not_found", guest: null };
    if (match.attended_at) {
      return { status: "already_present", guest: serializeGuest(match) };
    }
    const now = new Date().toISOString();
    const { data: updatedRows, error: updateError } = await supabase
      .from("guests")
      .update({ attended_at: now, updated_at: now })
      .eq("id", match.id)
      .select();
    if (updateError) throw updateError;
    const updated = (updatedRows as GuestRow[])[0];
    if (!updated) return { status: "not_found", guest: null };
    return { status: "checked_in", guest: serializeGuest(updated) };
  },

  async createGuest({
    name,
    origin,
  }: {
    name: string;
    origin: string;
  }): Promise<{ ok: true; guest: Guest }> {
    ensureConfigured();
    const cardCode = `BT-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
    const qrPayload = `Nama: ${name}\nAsal: ${origin}\nKode: ${cardCode}`;
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("guests")
      .insert({
        name,
        origin,
        card_code: cardCode,
        qr_payload: qrPayload,
        created_at: now,
        updated_at: now,
      })
      .select();
    if (error) throw error;
    const row = (data as GuestRow[])[0];
    if (!row) throw new Error("Tamu gagal disimpan");
    return { ok: true, guest: serializeGuest(row) };
  },

  async updateGuest({
    id,
    name,
    origin,
  }: {
    id: number;
    name: string;
    origin: string;
  }): Promise<{ ok: boolean }> {
    ensureConfigured();
    const { data: existingRows, error: fetchError } = await supabase
      .from("guests")
      .select("card_code")
      .eq("id", id)
      .limit(1);
    if (fetchError) throw fetchError;
    const existing = (existingRows as { card_code: string }[])[0];
    if (!existing) return { ok: false };
    const qrPayload = `Nama: ${name}\nAsal: ${origin}\nKode: ${existing.card_code}`;
    const { error } = await supabase
      .from("guests")
      .update({
        name,
        origin,
        qr_payload: qrPayload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
    return { ok: true };
  },

  async setAttendance({
    id,
    present,
  }: {
    id: number;
    present: boolean;
  }): Promise<{ ok: boolean }> {
    ensureConfigured();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("guests")
      .update({ attended_at: present ? now : null, updated_at: now })
      .eq("id", id)
      .select("id");
    if (error) throw error;
    return { ok: (data?.length ?? 0) > 0 };
  },

  async deleteGuest({ id }: { id: number }): Promise<{ ok: boolean }> {
    ensureConfigured();
    const { data, error } = await supabase
      .from("guests")
      .delete()
      .eq("id", id)
      .select("id");
    if (error) throw error;
    return { ok: (data?.length ?? 0) > 0 };
  },
};
