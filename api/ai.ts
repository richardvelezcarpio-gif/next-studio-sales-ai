import OpenAI from 'openai';

const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
const json = (statusCode:number, body:unknown) => ({ statusCode, headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
const prompt = (operation:string, context:Record<string,unknown>) => `You are a careful sales assistant for Next Studio. Operation: ${operation}. Use only this prospect context: ${JSON.stringify(context)}. Respect the prospect language. Never invent prices, discounts, dates, guarantees, testimonials, results, features, or payment terms. If unknown, say it needs confirmation. Return concise valid JSON only.`;

export default async function handler(req:any, res:any) {
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({provider:'local',fallback:true,error:'AI provider is not configured'});
  const { operation, context } = req.body || {};
  if (!operation || !context || typeof context !== 'object') return res.status(400).json({error:'Invalid AI request'});
  try {
    const client = new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:15000});
    const response = await client.responses.create({model,input:prompt(operation,context),store:false});
    const text=response.output_text.trim();
    const result=JSON.parse(text.replace(/^```json\s*|\s*```$/g,''));
    return res.status(200).json({provider:'openai',model,result});
  } catch (error) {
    console.error('OpenAI sales assistant failed', error);
    return res.status(503).json({provider:'local',fallback:true,error:'AI service is temporarily unavailable'});
  }
}

export { json };
