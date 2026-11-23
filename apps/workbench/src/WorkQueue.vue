<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {RefreshCw,AlertTriangle,GitPullRequest,CircleDot,Activity,ExternalLink} from 'lucide-vue-next'
import type {WorkSnapshot,WorkItem,ActionRun} from './api'
const props=defineProps<{view:'issues'|'pullRequests'|'actions';snapshot:WorkSnapshot|null;busy:boolean}>()
const emit=defineEmits<{sync:[]}>()
const term=ref(''),page=ref(1),PAGE=35
watch(()=>props.view,()=>{term.value='';page.value=1})
watch(term,()=>page.value=1)
const title=computed(()=>props.view==='issues'?'跨仓库 Issues':props.view==='pullRequests'?'跨仓库 Pull Requests':'GitHub Actions')
const collection=computed(()=>props.snapshot?(props.view==='issues'?props.snapshot.issues:props.snapshot.pullRequests):null)
const rows=computed<WorkItem[]>(()=>{const all=collection.value?.items||[],q=term.value.toLowerCase();return all.filter(x=>!q||[x.repository,x.title,x.author||'',...x.labels].join(' ').toLowerCase().includes(q)).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))})
const runs=computed<ActionRun[]>(()=>Object.values(props.snapshot?.actions.runsByRepo||{}).flatMap(g=>g.runs).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))))
const filteredRuns=computed(()=>{const q=term.value.toLowerCase();return runs.value.filter(x=>!q||[x.repository,x.name,x.branch||'',x.status,x.conclusion||''].join(' ').toLowerCase().includes(q))})
const total=computed(()=>props.view==='actions'?filteredRuns.value.length:rows.value.length)
const pages=computed(()=>Math.max(1,Math.ceil(total.value/PAGE)))
const visibleIssues=computed(()=>rows.value.slice((page.value-1)*PAGE,page.value*PAGE))
const visibleRuns=computed(()=>filteredRuns.value.slice((page.value-1)*PAGE,page.value*PAGE))
const scanned=computed(()=>Object.values(props.snapshot?.actions.runsByRepo||{}).filter(x=>x.checkedAt!==null).length)
const errors=computed(()=>props.view==='actions'?props.snapshot?.actions.errors||[]:collection.value?.error?[collection.value.error]:[])
function date(t:string|null){return t?new Date(t).toLocaleString('zh-CN',{hour12:false}):'未知'}
</script>
<template>
<section class="panel workqueue">
  <div class="panel-header"><div><h2>{{title}}</h2><p v-if="view==='actions'">按仓库分批轮询默认分支工作流，保留最近已知状态。</p><p v-else>只读聚合 GitHub 搜索结果；点击事项可打开 GitHub。</p></div><button class="primary-button" :disabled="busy" @click="emit('sync')"><RefreshCw :size="15" :class="{spinning:busy}"/>{{busy?'正在同步…':view==='actions'?'继续扫描 / 刷新':'同步 Issue / PR / Actions'}}</button></div>
  <div class="summary-strip"><span>当前可见 <strong>{{total}}</strong> 条</span><span v-if="view==='actions'">已检查 <strong>{{scanned}} / {{snapshot?.actions.totalRepositories||0}}</strong> 个仓库</span><span v-else>GitHub 查询命中 <strong>{{collection?.totalCount||0}}</strong> 条</span><span>更新时间：{{date(view==='actions'?snapshot?.actions.lastScanAt||null:collection?.updatedAt||null)}}</span></div>
  <div v-if="!snapshot?.updatedAt" class="notice info panel-notice">尚未采集开发工作台数据。请先同步仓库索引，再点击“同步”。</div>
  <div v-if="collection?.truncated" class="notice warning panel-notice"><AlertTriangle :size="16"/>GitHub 搜索最多提供 1,000 条匹配结果；当前列表可能不完整。</div>
  <div v-if="errors.length" class="notice warning panel-notice"><AlertTriangle :size="16"/>{{errors.slice(0,3).join('；')}}{{errors.length>3?'…':''}}</div>
  <div class="filters"><label class="searchbox"><CircleDot v-if="view==='issues'" :size="16"/><GitPullRequest v-else-if="view==='pullRequests'" :size="16"/><Activity v-else :size="16"/><input v-model="term" placeholder="筛选仓库、标题、标签…" /></label></div>
  <div class="table-wrap"><table v-if="view!=='actions'"><thead><tr><th>仓库 / #</th><th>事项</th><th>作者</th><th>最近更新</th><th></th></tr></thead><tbody>
    <tr v-for="item in visibleIssues" :key="item.id"><td><div class="repo-name">{{item.repository}}</div><div class="repo-desc">#{{item.number}}</div></td><td><div class="issue-title">{{item.title}}</div><div class="tags compact"><span v-for="tag in item.labels.slice(0,3)" :key="tag">{{tag}}</span></div></td><td>{{item.author||'—'}}</td><td>{{date(item.updatedAt)}}</td><td><a :href="item.url" target="_blank" rel="noopener noreferrer" class="row-open" :aria-label="'打开 #'+item.number"><ExternalLink :size="16"/></a></td></tr>
    <tr v-if="!visibleIssues.length"><td colspan="5" class="empty">暂无可显示事项；未同步时不能据此判断仓库没有 Issue 或 PR。</td></tr>
  </tbody></table>
  <table v-else><thead><tr><th>仓库</th><th>工作流</th><th>分支</th><th>状态</th><th>时间</th><th></th></tr></thead><tbody>
    <tr v-for="run in visibleRuns" :key="run.repository+':'+run.id"><td><div class="repo-name">{{run.repository}}</div></td><td><div class="issue-title">{{run.name}}</div></td><td>{{run.branch||'—'}}</td><td><span :class="['run-status',run.conclusion==='success'?'ok':run.conclusion==='failure'?'bad':'neutral']">{{run.conclusion||run.status}}</span></td><td>{{date(run.createdAt)}}</td><td><a :href="run.url" target="_blank" rel="noopener noreferrer" class="row-open" aria-label="打开 Actions 运行"><ExternalLink :size="16"/></a></td></tr>
    <tr v-if="!visibleRuns.length"><td colspan="6" class="empty">尚无扫描结果。Actions 分批采集，未出现不代表工作流成功或不存在。</td></tr>
  </tbody></table></div>
  <div class="pagination"><span>第 {{page}} / {{pages}} 页 · {{total}} 条缓存结果</span><div><button :disabled="page<=1" @click="page--">上一页</button><button :disabled="page>=pages" @click="page++">下一页</button></div></div>
  <div class="work-footnote">只读模式，不会合并 PR 或修改 Issue。Actions 每次最多检查 12 个仓库；请结合更新时间判断数据有效性。</div>
</section>
</template>
