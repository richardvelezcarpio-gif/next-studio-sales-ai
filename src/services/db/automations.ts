import { supabase } from '../../lib/supabase';
const client=()=>{if(!supabase)throw new Error('Cloud not configured');return supabase};
export const automationsRepository={
  getAll:async()=>{const {data,error}=await client().from('automation_rules').select('*').order('created_at',{ascending:false});if(error)throw error;return data||[]},
  create:async(x:{name:string;active:boolean;triggerType:string;condition?:Record<string,unknown>;actionType:string;actionConfig?:Record<string,unknown>})=>{const {data,error}=await client().from('automation_rules').insert({name:x.name,active:x.active,trigger_type:x.triggerType,condition:x.condition||{},action_type:x.actionType,action_config:x.actionConfig||{}}).select().single();if(error)throw error;return data},
  update:async(id:string,x:Record<string,unknown>)=>{const {data,error}=await client().from('automation_rules').update({...x,updated_at:new Date().toISOString()}).eq('id',id).select().single();if(error)throw error;return data},
  remove:async(id:string)=>{const {error}=await client().from('automation_rules').delete().eq('id',id);if(error)throw error},
  log:async(x:{ruleId:string;prospectId?:string;action:string;result:string})=>{const {error}=await client().from('automation_logs').insert({rule_id:x.ruleId,prospect_id:x.prospectId||null,action:x.action,result:x.result});if(error)throw error}
};
