import { supabase } from '../../lib/supabase';

export type CloudFollowUp={id:string;prospectId:string;title?:string;dueAt?:string;type:'call'|'email'|'whatsapp'|'meeting'|'other';note?:string;status:'pending'|'completed'|'overdue';priority?:string;createdAt:string;completedAt?:string};
const client=()=>{if(!supabase)throw new Error('Cloud not configured');return supabase};
const map=(r:any):CloudFollowUp=>({id:r.id,prospectId:r.prospect_id,title:r.title||undefined,dueAt:r.due_at||undefined,type:r.type||'other',note:r.note||r.title||undefined,status:r.status==='open'?'pending':r.status,priority:r.priority||undefined,createdAt:r.created_at,completedAt:r.completed_at||undefined});
export const followUpsRepository={
  getAll:async()=>{const {data,error}=await client().from('follow_ups').select('*').order('due_at');if(error)throw error;return(data||[]).map(map)},
  create:async(x:Omit<CloudFollowUp,'id'|'createdAt'|'completedAt'>)=>{const {data,error}=await client().from('follow_ups').insert({prospect_id:x.prospectId,title:x.title||null,due_at:x.dueAt||null,type:x.type,note:x.note||null,status:x.status,priority:x.priority||null}).select().single();if(error)throw error;return map(data)},
  update:async(id:string,x:Partial<CloudFollowUp>)=>{const {data,error}=await client().from('follow_ups').update({title:x.title,due_at:x.dueAt,type:x.type,note:x.note,status:x.status,priority:x.priority,completed_at:x.completedAt||null,updated_at:new Date().toISOString()}).eq('id',id).select().single();if(error)throw error;return map(data)},
  remove:async(id:string)=>{const {error}=await client().from('follow_ups').delete().eq('id',id);if(error)throw error}
};
