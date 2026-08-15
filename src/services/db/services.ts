import { supabase } from "../../lib/supabase";
export type CloudService={id:string;name:string;description?:string;defaultPrice?:number|null};
export const servicesRepository={getAll:async()=>{if(!supabase)throw new Error("Cloud storage is not configured.");const{data,error}=await supabase.from("services").select("id,name,description,default_price").eq("active",true).order("name");if(error)throw error;return(data||[]).map((x:any)=>({id:x.id,name:x.name,description:x.description||undefined,defaultPrice:x.default_price==null?null:Number(x.default_price)}))}};
