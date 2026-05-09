const SUPABASE_URL = 'https://xcbjhkpotvphupvcvmxd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjYmpoa3BvdHZwaHVwdmN2bXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NjQzNDQsImV4cCI6MjA5MzU0MDM0NH0.zNwsSBbD-2SkhqIRceBdiUFRcKzLftMLA1XclZ1Vnak';

const baseHeaders = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

function buildUrl(table, params = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, value);
  }
  return url.toString();
}

export async function fetchAll(table, params = {}) {
  const allRows = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const res = await fetch(buildUrl(table, params), {
      headers: {
        ...baseHeaders,
        'Range': `${from}-${from + pageSize - 1}`,
        'Range-Unit': 'items',
        'Prefer': 'count=exact'
      }
    });

    // 206 = partial, 200 = full result fits in one page
    if (!res.ok && res.status !== 206) {
      const body = await res.text();
      throw new Error(`fetchAll failed [${res.status}]: ${body}`);
    }

    const data = await res.json();
    allRows.push(...data);

    // If we got less than a full page, we're done
    if (data.length < pageSize) break;

    from += pageSize;
  }

  return allRows;
}

export async function get(table, params = {}) {
  const res = await fetch(buildUrl(table, params), {
    headers: {
      ...baseHeaders,
      'Range': '0-9999',
      'Range-Unit': 'items'
    }
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`get failed [${res.status}]: ${body}`);
  }
  return res.json();
}

export async function post(table, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...baseHeaders, 'Prefer': 'return=representation' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const b = await res.text();
    throw new Error(`post failed [${res.status}]: ${b}`);
  }
  return res.json();
}

export async function patch(table, id, body) {
  const res = await fetch(buildUrl(table, { id: `eq.${id}` }), {
    method: 'PATCH',
    headers: { ...baseHeaders, 'Prefer': 'return=representation' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const b = await res.text();
    throw new Error(`patch failed [${res.status}]: ${b}`);
  }
  return res.json();
}

export async function del(table, id) {
  const res = await fetch(buildUrl(table, { id: `eq.${id}` }), {
    method: 'DELETE',
    headers: baseHeaders
  });
  if (!res.ok) {
    const b = await res.text();
    throw new Error(`del failed [${res.status}]: ${b}`);
  }
  return res.json();
}
