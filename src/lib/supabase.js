const SUPABASE_URL = "https://xcbjhkpotvphupvcvmxd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjYmpoa3BvdHZwaHVwdmN2bXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NjQzNDQsImV4cCI6MjA5MzU0MDM0NH0.zNwsSBbD-2SkhqIRceBdiUFRcKzLftMLA1XclZ1Vnak";

const HEADERS = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation"
};

export async function get(table, params = {}) {
  const q = new URLSearchParams(params);
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`, { headers: HEADERS });
  return r.json();
}

export async function post(table, data) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(data)
  });
  return r.json();
}

export async function patch(table, id, data) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: HEADERS,
    body: JSON.stringify(data)
  });
  return r.json();
}

export async function del(table, id) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "DELETE",
    headers: HEADERS
  });
}

export async function fetchAll(table, params = {}) {
  const pageSize = 1000;
  let from = 0;
  let all = [];
  while (true) {
    const q = new URLSearchParams(params);
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${q}`, {
      headers: {
        ...HEADERS,
        "Range-Unit": "items",
        "Range": `${from}-${from + pageSize - 1}`
      }
    });
    const data = await r.json();
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}
