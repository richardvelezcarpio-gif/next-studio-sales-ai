import type { CommunicationMessage } from '../../types';
export interface EmailProvider {createDraft(input:Omit<CommunicationMessage,'id'|'status'|'createdAt'|'provider'>):CommunicationMessage; sendEmail(draft:CommunicationMessage):Promise<CommunicationMessage>; testConnection():Promise<{connected:boolean;status:string}>}
export class LocalEmailProvider implements EmailProvider {createDraft(input:Omit<CommunicationMessage,'id'|'status'|'createdAt'|'provider'>):CommunicationMessage{return {...input,id:crypto.randomUUID(),status:'draft',createdAt:new Date().toISOString(),provider:'local'}} async sendEmail(draft:CommunicationMessage){return {...draft,status:'failed' as const,provider:'local' as const}} async testConnection(){return {connected:false,status:'Not Connected'}}}
export class GmailEmailProvider extends LocalEmailProvider { /* OAuth implementation intentionally deferred; tokens never live in the browser. */ }
export const localEmailProvider=new LocalEmailProvider();
