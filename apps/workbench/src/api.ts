export interface Repo { id:number; name:string; fullName:string; description:string|null; visibility:string; archived:boolean; fork:boolean; homepage:string|null; language:string|null; topics:string[]; stars:number; pushedAt:string|null; updatedAt:string; defaultBranch:string; htmlUrl:string; collectedAt:string }
export interface Snapshot { repositories:Repo[]; updatedAt:string|null; source:'live'|'cache'|'none'; errors:string[]; rateLimit?:{remaining:number|null;reset:number|null} }
export interface WorkItem { id:number; repository:string; number:number; title:string; url:string; createdAt:string|null; updatedAt:string|null; author:string|null; labels:string[]; draft:boolean; kind:'issue'|'pr' }
export interface WorkCollection { items:WorkItem[]; totalCount:number; updatedAt:string|null; truncated:boolean; error:string|null }
export interface ActionRun { id:number; repository:string; name:string; status:string; conclusion:string|null; branch:string|null; headSha:string|null; createdAt:string|null; updatedAt:string|null; url:string }
export interface ActionGroup { repository:string; runs:ActionRun[]; checkedAt:string|null; error:string|null }
export interface WorkSnapshot { version:number; updatedAt:string|null; issues:WorkCollection; pullRequests:WorkCollection; actions:{runsByRepo:Record<string,ActionGroup>; lastScanAt:string|null; checkedRepositories:number; totalRepositories:number; nextIndex:number; errors:string[]}; errors:string[] }
export interface GovernanceEntry { repo:string; tier?:string; status?:string; kind?:string; data_risk?:string; governance?:string; visibility?:string; notes?:string }
export interface GovernanceSnapshot { entries:Record<string,GovernanceEntry>; conflicts:{repository:string;field:string;configured:string;actual:string}[]; definedCount:number; matchedCount:number; errors:string[] }
async function getJson<T>(path:string):Promise<T>{const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw new Error('读取失败：HTTP '+r.status);return r.json()}
async function postJson<T>(path:string):Promise<T>{const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data.error||'同步失败');return data}
export const loadRepositories=()=>getJson<Snapshot>('/api/repositories')
export const refreshRepositories=()=>postJson<Snapshot>('/api/sync')
export const loadStatus=()=>getJson<{configured:boolean;owner:string;lastSync:string|null;warning:string|null}>('/api/status')
export const loadWork=()=>getJson<WorkSnapshot>('/api/workbench')
export const refreshWork=()=>postJson<WorkSnapshot>('/api/workbench/sync')
export const loadGovernance=()=>getJson<GovernanceSnapshot>('/api/governance')
