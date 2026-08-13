export type Language = 'en' | 'es'
export type Stage = 'new'|'contacted'|'replied'|'information_sent'|'interested'|'appointment'|'quote_sent'|'won'|'lost'
export type Source = 'facebook'|'instagram'|'whatsapp'|'google'|'referral'|'website'|'networking'|'walk_in'|'other'
export type Service = 'website'|'platform'|'automation'|'ai'|'digital_card'|'qr'|'printing'|'marketing'|'software'|'other'
export interface Lead { id:string; firstName:string; lastName:string; business:string; phone:string; email:string; whatsapp:string; instagram:string; facebook:string; website:string; businessType:string; city:string; state:string; source:Source; service:Service; stage:Stage; potentialValue:number; preferredLanguage:Language; lastContact?:string; nextFollowUp?:string; quoteStatus:'not_sent'|'sent'|'accepted'|'rejected'; quoteAmount?:number; quoteDate?:string; finalSaleAmount?:number; saleDate?:string; lostReason?:string; createdAt:string; demo?:boolean }
export interface Note { id:string; leadId:string; body:string; createdAt:string }
export interface Activity { id:string; leadId?:string; title:string; createdAt:string }
export interface FollowUp { id:string; leadId:string; date:string; reason:string; notes:string; completed:boolean }
export interface Template { id:string; category:string; name:string; en:string; es:string; custom?:boolean }
export interface Settings { name:string; company:string; phone:string; email:string; website:string; digitalCardUrl:string; bookingUrl:string; currency:string; landingUrls:Partial<Record<Service,string>> }
