const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

export async function supabaseRest<T>(path: string): Promise<T> {
  if (!url || !key) throw new Error("Supabase connection is not configured");
  const response = await fetch(`${url}/rest/v1/${path}`, {cache:"no-store",headers:{apikey:key,Authorization:`Bearer ${key}`,Accept:"application/json"}});
  if (!response.ok) throw new Error(`Supabase query failed (${response.status}): ${(await response.text()).slice(0,240)}`);
  return response.json() as Promise<T>;
}
