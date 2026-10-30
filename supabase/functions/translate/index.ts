// Supabase Edge Function "translate": dịch bài báo Anh → Việt bằng Claude, bám theo từ điển thuật ngữ logistics.
// Cách bật: xem README (mục "Dịch bài chuẩn xác"). Cần secret ANTHROPIC_API_KEY.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const MODEL = Deno.env.get('ANTHROPIC_MODEL') || 'claude-sonnet-5-5';
const MAX_CHARS = 14000;   // giới hạn mỗi lần gọi để tránh tốn phí ngoài ý muốn

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    // Chỉ cho người đã đăng nhập dùng (tránh người lạ xài hết tiền API)
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: u, error: ue } = await sb.auth.getUser();
    if (ue || !u?.user) return json({ error: 'unauthorized' }, 401);

    const key = Deno.env.get('ANTHROPIC_API_KEY');
    if (!key) return json({ error: 'missing ANTHROPIC_API_KEY' }, 500);

    const { paragraphs, glossary, keep, title } = await req.json();
    if (!Array.isArray(paragraphs) || !paragraphs.length) return json({ error: 'no paragraphs' }, 400);
    if (paragraphs.join('').length > MAX_CHARS) return json({ error: 'too long' }, 413);

    const gl = (Array.isArray(glossary) ? glossary : []).slice(0, 200).map((g: string[]) => `- ${g[0]} → ${g[1]}`).join('\n');
    const system = `Bạn là biên dịch viên chuyên nghiệp Anh–Việt trong lĩnh vực logistics, chuỗi cung ứng, vận tải, hải quan và thương mại quốc tế.
Dịch trung thành, đầy đủ, KHÔNG tóm tắt, KHÔNG thêm ý. Văn phong tiếng Việt tự nhiên, rõ ràng, đúng văn phong báo chí kinh tế.
Quy tắc:
- Dùng đúng thuật ngữ chuyên ngành tiếng Việt đang dùng trong ngành; nếu có trong BẢNG THUẬT NGỮ thì bắt buộc theo bảng.
- Giữ nguyên tên riêng, tên công ty, thương hiệu, địa danh có tên quốc tế quen thuộc, mã Incoterms (FOB, CIF, EXW…), viết tắt (ETA, B/L, TEU…), số liệu, đơn vị, tiền tệ.
- Giữ nguyên số đoạn: mỗi đoạn đầu vào ↔ đúng một đoạn đầu ra, cùng thứ tự.
${keep ? '- Ở lần xuất hiện đầu tiên của mỗi thuật ngữ chuyên ngành trong một đoạn, viết dạng "bản dịch tiếng Việt (English term)".' : '- Không cần kèm tiếng Anh trong ngoặc trừ khi thuật ngữ không có từ tương đương.'}
Chỉ trả về một mảng JSON các chuỗi (không giải thích, không markdown).${gl ? '\n\nBẢNG THUẬT NGỮ:\n' + gl : ''}`;

    const user = `Tiêu đề bài: ${title || ''}\n\nCác đoạn cần dịch (mảng JSON):\n${JSON.stringify(paragraphs)}`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: 8000, system, messages: [{ role: 'user', content: user }] }),
    });
    const j = await r.json();
    if (!r.ok) return json({ error: j?.error?.message || 'anthropic error' }, 502);
    const text = (j.content || []).map((c: { text?: string }) => c.text || '').join('').trim();
    const a = text.indexOf('['), b = text.lastIndexOf(']');
    const arr = JSON.parse(text.slice(a, b + 1));
    if (!Array.isArray(arr) || arr.length !== paragraphs.length) return json({ error: 'bad shape' }, 502);
    return json({ translations: arr.map(String), engine: 'claude' });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
