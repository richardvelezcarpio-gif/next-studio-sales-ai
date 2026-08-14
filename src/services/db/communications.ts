import { supabase } from '../../lib/supabase';

type Draft = { id:string; prospectId?:string; channel:string; recipient?:string; subject?:string; content:string; createdAt:string; updatedAt?:string };
type Communication = { id:string; prospectId?:string; channel:string; direction:string; subject?:string; content:string; status:string; provider:string; createdAt:string; sentAt?:string };
const client=()=>{if(!supabase)throw new Error('Cloud not configured');return supabase};
const draft=(r:any):Draft=>({id:r.id,prospectId:r.prospect_id||undefined,channel:r.channel,recipient:r.recipient||undefined,subject:r.subject||undefined,content:r.content||'',createdAt:r.created_at,updatedAt:r.updated_at});
const message=(r:any):Communication=>({id:r.id,prospectId:r.prospect_id||undefined,channel:r.channel,direction:r.direction,subject:r.subject||undefined,content:r.content||'',status:r.status,provider:r.provider,createdAt:r.created_at,sentAt:r.sent_at||undefined});
export const communicationsRepository={
  getDraftsByProspectId:async(prospectId:string)=>{const {data,error}=await client().from('communication_drafts').select('*').eq('prospect_id',prospectId).order('created_at',{ascending:false});if(error)throw error;return(data||[]).map(draft)},
  getCommunicationsByProspectId:async(prospectId:string)=>{const {data,error}=await client().from('communications').select('*').eq('prospect_id',prospectId).order('created_at',{ascending:false});if(error)throw error;return(data||[]).map(message)},
  drafts:async()=>{const {data,error}=await client().from('communication_drafts').select('*').order('updated_at',{ascending:false});if(error)throw error;return (data||[]).map(draft)},
  createDraft:async(x:Omit<Draft,'id'|'createdAt'|'updatedAt'>)=>{const {data,error}=await client().from('communication_drafts').insert({prospect_id:x.prospectId||null,channel:x.channel,recipient:x.recipient||null,subject:x.subject||null,content:x.content}).select().single();if(error)throw error;return draft(data)},
  updateDraft:async(id:string,x:Partial<Draft>)=>{const {data,error}=await client().from('communication_drafts').update({prospect_id:x.prospectId||null,channel:x.channel,recipient:x.recipient||null,subject:x.subject||null,content:x.content,updated_at:new Date().toISOString()}).eq('id',id).select().single();if(error)throw error;return draft(data)},
  removeDraft:async(id:string)=>{const {error}=await client().from('communication_drafts').delete().eq('id',id);if(error)throw error},
  list:async()=>{const {data,error}=await client().from('communications').select('*').order('created_at',{ascending:false});if(error)throw error;return (data||[]).map(message)},
  record:async(x:Omit<Communication,'id'|'createdAt'>)=>{const {data,error}=await client().from('communications').insert({prospect_id:x.prospectId||null,channel:x.channel,direction:x.direction,subject:x.subject||null,content:x.content,status:x.status,provider:x.provider,sent_at:x.sentAt||null}).select().single();if(error)throw error;return message(data)}
};
