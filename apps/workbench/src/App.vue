<script setup lang="ts">
import {computed,onMounted,ref,watch} from 'vue'
import {LayoutDashboard,FolderGit2,Search,RefreshCw,ExternalLink,GitFork,Archive,LockKeyhole,Globe,AlertTriangle,CheckCircle2,SlidersHorizontal,PanelLeftClose,PanelLeftOpen,ChevronRight,ShieldCheck,GitPullRequest,CircleDot,Activity,Scale} from 'lucide-vue-next'
import {loadRepositories,refreshRepositories,loadStatus,loadWork,refreshWork,loadGovernance,type Repo,type Snapshot,type WorkSnapshot,type GovernanceSnapshot} from './api'
import WorkQueue from './WorkQueue.vue'
import GovernanceBoard from './GovernanceBoard.vue'
const repositories=ref<Repo[]>([]),updatedAt=ref<string|null>(null),origin=ref('none'),errors=ref<string[]>([]),loading=ref(false),syncing=ref(false),warning=ref(''),configured=ref(false),query=ref(''),visibility=ref('all'),status=ref('all'),sort=ref('pushed'),tab=ref('overview'),selected=ref<Repo|null>(null),collapsed=ref(false),dark=ref(localStorage.getItem('projects-theme')==='dark'),page=ref(1)
const work=ref<WorkSnapshot|null>(null),governance=ref<GovernanceSnapshot|null>(null),workSyncing=ref(false)
const headlineTitle=computed(()=>({overview:'项目总览',repositories:'仓库资产库',issues:'Issues 管理',pullRequests:'Pull Requests',actions:'Actions 监控',governance:'项目治理'}[tab.value]||'项目管理'))
const PAGE_SIZE=30
watch(dark,v=>{document.documentElement.dataset.theme=v?'dark':'light';localStorage.setItem('projects-theme',v?'dark':'light')},{immediate:true})
watch([query,visibility,status,sort],()=>page.value=1)
const filtered=computed(()=>repositories.value.filter(r=>{const q=query.value.toLowerCase().trim();return (!q||[r.name,r.fullName,r.description||'',r.language||'',...r.topics].join(' ').toLowerCase().includes(q))&&(visibility.value==='all'||r.visibility===visibility.value)&&(status.value==='all'||(status.value==='archived'?r.archived:status.value==='fork'?r.fork:!r.archived&&!r.fork))}).sort((a,b)=>sort.value==='stars'?b.stars-a.stars:sort.value==='name'?a.fullName.localeCompare(b.fullName):String(b.pushedAt||'').localeCompare(String(a.pushedAt||''))))
const pages=computed(()=>Math.max(1,Math.ceil(filtered.value.length/PAGE_SIZE)))
const visible=computed(()=>filtered.value.slice((page.value-1)*PAGE_SIZE,page.value*PAGE_SIZE))
const stats=computed(()=>({total:repositories.value.length,private:repositories.value.filter(x=>x.visibility==='private').length,public:repositories.value.filter(x=>x.visibility==='public').length,archived:repositories.value.filter(x=>x.archived).length,active:repositories.value.filter(x=>!x.archived&&!x.fork).length}))
function setSnapshot(s:Snapshot){repositories.value=s.repositories;updatedAt.value=s.updatedAt;origin.value=s.source;errors.value=s.errors}
function fmt(v:string|null){return v?new Date(v).toLocaleString('zh-CN',{hour12:false}):'暂无数据'}
async function init(){loading.value=true;try{const [s,state,w,g]=await Promise.all([loadRepositories(),loadStatus(),loadWork(),loadGovernance()]);setSnapshot(s);configured.value=state.configured;warning.value=state.warning||'';work.value=w;governance.value=g}catch(e){warning.value=String(e)}finally{loading.value=false}}
async function sync(){syncing.value=true;warning.value='';try{setSnapshot(await refreshRepositories());configured.value=true;governance.value=await loadGovernance()}catch(e){warning.value=String(e)}finally{syncing.value=false}}
async function syncWork(){workSyncing.value=true;warning.value='';try{work.value=await refreshWork()}catch(e){warning.value=String(e)}finally{workSyncing.value=false}}
onMounted(init)
function openRepo(r:Repo){selected.value=r}
</script>
<template>
<div class="shell">
  <aside :class="['sidebar', {collapsed}]">
    <div class="brand"><div class="brand-logo">W</div><div v-if="!collapsed" class="brand-word"><strong>Weepwood</strong><small>Projects · v3</small></div><button class="icon-button collapse" :aria-label="collapsed?'展开导航':'折叠导航'" @click="collapsed=!collapsed"><PanelLeftOpen v-if="collapsed" :size="18"/><PanelLeftClose v-else :size="18"/></button></div>
    <div class="section-caption" v-if="!collapsed">WORKSPACE</div>
    <nav aria-label="导航">
      <button :class="['nav-item',{active:tab==='overview'}]" @click="tab='overview';selected=null"><LayoutDashboard :size="17"/><span v-if="!collapsed">概览</span></button>
      <button :class="['nav-item',{active:tab==='repositories'}]" @click="tab='repositories';selected=null"><FolderGit2 :size="17"/><span v-if="!collapsed">全部仓库</span><small v-if="!collapsed">{{stats.total}}</small></button>
      <div class="section-caption nav-subtitle" v-if="!collapsed">DEVELOPMENT</div>
      <button :class="['nav-item',{active:tab==='issues'}]" @click="tab='issues';selected=null"><CircleDot :size="17"/><span v-if="!collapsed">Issues</span><small v-if="!collapsed">{{work?.issues.items.length||0}}</small></button>
      <button :class="['nav-item',{active:tab==='pullRequests'}]" @click="tab='pullRequests';selected=null"><GitPullRequest :size="17"/><span v-if="!collapsed">Pull Requests</span><small v-if="!collapsed">{{work?.pullRequests.items.length||0}}</small></button>
      <button :class="['nav-item',{active:tab==='actions'}]" @click="tab='actions';selected=null"><Activity :size="17"/><span v-if="!collapsed">Actions</span></button>
      <div class="section-caption nav-subtitle" v-if="!collapsed">GOVERNANCE</div>
      <button :class="['nav-item',{active:tab==='governance'}]" @click="tab='governance';selected=null"><Scale :size="17"/><span v-if="!collapsed">项目治理</span></button>
    </nav>
    <div class="sidebar-bottom"><ShieldCheck :size="17"/><span v-if="!collapsed">本地私有工作台</span></div>
  </aside>
  <main class="workspace">
    <header class="topbar"><div class="crumb">WORKSPACE <ChevronRight :size="14"/> {{headlineTitle}}</div><div class="toolbar"><span class="sync-tag"><span :class="['dot',configured?'green':'amber']"></span>{{configured?'GitHub 已配置':'需要配置 Token'}}</span><button class="subtle-button" @click="dark=!dark">{{dark?'浅色模式':'深色模式'}}</button><button class="primary-button" :disabled="syncing" @click="sync"><RefreshCw :size="15" :class="{spinning:syncing}"/>{{syncing?'同步中…':'同步仓库'}}</button></div></header>
    <div class="content">
      <div class="headline"><div><div class="eyebrow">GITHUB PORTFOLIO</div><h1>{{headlineTitle}}</h1><p>统一管理 GitHub 项目资产 · 本地数据与公开网站严格隔离</p></div><span class="last-sync">最近同步：{{fmt(updatedAt)}}</span></div>
      <div v-if="warning" class="notice warning"><AlertTriangle :size="17"/>{{warning}}</div>
      <div v-if="errors.length" class="notice"><AlertTriangle :size="16"/>部分仓库同步异常（{{errors.length}}）：{{errors.slice(0,2).join('；')}}<span v-if="errors.length>2">…</span></div>
      <div v-if="!configured" class="notice info"><LockKeyhole :size="17"/>设置环境变量 <code>GITHUB_TOKEN</code> 并启动本地服务，即可读取有权访问的私有仓库。凭据不会写入浏览器或 Pages。</div>
      <section v-if="tab==='overview'||tab==='repositories'" class="stats">
        <div class="stat"><div class="stat-label"><FolderGit2 :size="16"/>全部仓库</div><strong>{{stats.total}}</strong><small>已同步索引</small></div>
        <div class="stat"><div class="stat-label"><LockKeyhole :size="16"/>私有仓库</div><strong>{{stats.private}}</strong><small>只在本地工作台显示</small></div>
        <div class="stat"><div class="stat-label"><Globe :size="16"/>公开仓库</div><strong>{{stats.public}}</strong><small>可纳入公开目录</small></div>
        <div class="stat"><div class="stat-label"><Archive :size="16"/>已归档</div><strong>{{stats.archived}}</strong><small>只读维护状态</small></div>
      </section>
      <section v-if="tab==='overview'||tab==='repositories'" class="panel"><div class="panel-header"><div><h2>仓库列表</h2><p>支持搜索、筛选及分页，所有数据均来自当前本地索引。</p></div><span class="count">{{filtered.length}} 个结果</span></div>
        <div class="filters"><label class="searchbox"><Search :size="17"/><input v-model="query" placeholder="搜索名称、描述、语言或标签…"/></label><label class="selectwrap"><SlidersHorizontal :size="15"/><select v-model="visibility"><option value="all">全部可见性</option><option value="public">Public</option><option value="private">Private</option></select></label><select v-model="status"><option value="all">全部状态</option><option value="active">正常仓库</option><option value="archived">已归档</option><option value="fork">Fork</option></select><select v-model="sort"><option value="pushed">最近提交</option><option value="stars">Stars</option><option value="name">名称</option></select></div>
        <div class="table-wrap"><table><thead><tr><th>项目</th><th>技术语言</th><th>可见性</th><th>Star</th><th>最后推送</th><th></th></tr></thead><tbody>
          <tr v-for="r in visible" :key="r.id" @click="openRepo(r)" class="repo-row"><td><div class="repo-name">{{r.name}} <GitFork v-if="r.fork" :size="13"/><Archive v-if="r.archived" :size="13"/></div><div class="repo-desc">{{r.description||'暂无描述'}}</div></td><td>{{r.language||'—'}}</td><td><span :class="['visibility',r.visibility]">{{r.visibility==='private'?'● Private':'○ Public'}}</span></td><td>★ {{r.stars}}</td><td>{{r.pushedAt?new Date(r.pushedAt).toLocaleDateString('zh-CN'):'—'}}</td><td><button class="row-open" aria-label="查看项目详情" @click.stop="openRepo(r)"><ChevronRight :size="17"/></button></td></tr>
          <tr v-if="!visible.length"><td colspan="6" class="empty">{{loading?'正在加载…':repositories.length===0?'暂无仓库。配置 Token 后点击同步仓库。':'没有符合筛选条件的仓库'}}</td></tr>
        </tbody></table></div>
        <div class="pagination"><span>第 {{page}} / {{pages}} 页 · 每页 {{PAGE_SIZE}} 条</span><div><button :disabled="page<=1" @click="page--">上一页</button><button :disabled="page>=pages" @click="page++">下一页</button></div></div>
      </section>
      <WorkQueue v-if="tab==='issues'||tab==='pullRequests'||tab==='actions'" :view="tab" :snapshot="work" :busy="workSyncing" @sync="syncWork" />
      <GovernanceBoard v-if="tab==='governance'" :snapshot="governance" :repositories="repositories" />
      <div v-if="tab==='overview'&&work?.updatedAt" class="quick-overview"><button @click="tab='issues'"><CircleDot :size="16"/>Issues：{{work.issues.items.length}}</button><button @click="tab='pullRequests'"><GitPullRequest :size="16"/>PR：{{work.pullRequests.items.length}}</button><button @click="tab='actions'"><Activity :size="16"/>Actions 已扫描：{{Object.keys(work.actions.runsByRepo).length}} 个仓库</button></div>
      <div class="footnote">数据来源：{{origin==='live'?'GitHub API':origin==='cache'?'本地缓存':'尚未同步'}} · 公开网站仍由旧版 GitHub Pages 自动化独立维护</div>
    </div>
  </main>
  <div v-if="selected" class="overlay" @click.self="selected=null"><div class="detail" role="dialog" aria-modal="true" aria-label="仓库详情"><button class="close" @click="selected=null">×</button><div class="eyebrow">REPOSITORY DETAILS</div><h2>{{selected.fullName}}</h2><p>{{selected.description||'暂无描述'}}</p><div class="detail-grid"><span>可见性</span><strong>{{selected.visibility}}</strong><span>主要语言</span><strong>{{selected.language||'未知'}}</strong><span>默认分支</span><strong>{{selected.defaultBranch}}</strong><span>Stars</span><strong>{{selected.stars}}</strong><span>最近推送</span><strong>{{fmt(selected.pushedAt)}}</strong><span>状态</span><strong>{{selected.archived?'已归档':selected.fork?'Fork':'正常'}}</strong></div><div class="tags"><span v-for="t in selected.topics" :key="t">{{t}}</span></div><a class="primary-button detail-link" :href="selected.htmlUrl" target="_blank" rel="noopener noreferrer">打开 GitHub 仓库<ExternalLink :size="15"/></a><a v-if="selected.homepage" class="subtle-button detail-link" :href="selected.homepage" target="_blank" rel="noopener noreferrer">打开网站<ExternalLink :size="15"/></a></div></div>
</div>
</template>
