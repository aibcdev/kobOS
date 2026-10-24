import { createClient } from "@supabase/supabase-js";

/** Owner files (statements, guest lists, invoices) live in a private bucket; nothing here ever gets a public URL. */
export interface ImportStorage {
  put(path: string, body: Buffer, contentType: string): Promise<void>;
  get(path: string): Promise<Buffer>;
  remove(paths: string[]): Promise<void>;
}

export const IMPORTS_BUCKET = () => process.env.SUPABASE_IMPORTS_BUCKET?.trim() || "kob-imports";

function supabaseStorage(): ImportStorage {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("Import storage is not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  const client = createClient(url, key, { auth: { persistSession: false } });
  let ensured = false;
  const bucket = () => client.storage.from(IMPORTS_BUCKET());
  const ensureBucket = async () => {
    if (ensured) return;
    const { data } = await client.storage.getBucket(IMPORTS_BUCKET());
    if (!data) {
      const { error } = await client.storage.createBucket(IMPORTS_BUCKET(), { public: false, fileSizeLimit: "20MB" });
      if (error && !/already exists/i.test(error.message)) throw new Error(`Couldn't create ${IMPORTS_BUCKET()}: ${error.message}`);
    } else if (data.public) {
      throw new Error(`${IMPORTS_BUCKET()} must be a private bucket`);
    }
    ensured = true;
  };
  return {
    async put(path, body, contentType) {
      await ensureBucket();
      const { error } = await bucket().upload(path, body, { contentType, upsert: true });
      if (error) throw new Error(`Import upload failed: ${error.message}`);
    },
    async get(path) {
      const { data, error } = await bucket().download(path);
      if (error || !data) throw new Error(`Import file missing: ${path}`);
      return Buffer.from(await data.arrayBuffer());
    },
    async remove(paths) {
      if (paths.length) await bucket().remove(paths);
    },
  };
}

export function memoryStorage(): ImportStorage & { files: Map<string, Buffer> } {
  const files = new Map<string, Buffer>();
  return {
    files,
    async put(path, body) {
      files.set(path, Buffer.from(body));
    },
    async get(path) {
      const f = files.get(path);
      if (!f) throw new Error(`Import file missing: ${path}`);
      return f;
    },
    async remove(paths) {
      paths.forEach((p) => files.delete(p));
    },
  };
}

let override: ImportStorage | null = null;

/** Tests swap in memoryStorage(). */
export function setImportStorage(s: ImportStorage | null): void {
  override = s;
}

export function importStorage(): ImportStorage {
  return override ?? supabaseStorage();
}
