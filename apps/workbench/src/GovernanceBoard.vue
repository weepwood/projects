<script setup lang="ts">
import {computed,ref} from 'vue'
import {AlertTriangle,ExternalLink,Scale} from 'lucide-vue-next'
import type {GovernanceSnapshot,Repo} from './api'
const props=defineProps<{snapshot:GovernanceSnapshot|null;repositories:Repo[]}>()
const text=ref('')
const classified=computed(()=>props.repositories.map(r=>({repo:r,rule:props.snapshot?.entries[r.fullName.toLowerCase()]||null})))
const listed=computed(()=>classified.value.filter(x=>!text.value||[x.repo.fullName,x.rule?.tier||'',x.rule?.status||'',x.rule?.notes||''].join(' ').toLowerCase().includes(text.value.toLowerCase())))
const classifiedCount=computed(()=>classified.value.filter(x=>x.rule).length)
</script>
<template>
<section class="panel governance">
<div class="panel-header"><div><h2><Scale :size="19" class="inline-icon"/>项目治理</h2><p>从 governance/projects.yml 读取人工分级。GitHub API 为实际仓库状态来源；冲突需人工复核。</p></div><span class="count">{{classifiedCount}} / {{repositories.length}} 已配置</span></div>
<div v-if="!repositories.length" class="notice info panel-notice">请先同步仓库索引。</div>
<div v-if="snapshot?.conflicts.length" class="notice warning panel-notice"><AlertTriangle :size="17"/>{{snapshot.conflicts.length}} 项配置与 GitHub 实际状态不一致，请复核。</div>
<div v-if="snapshot?.errors.length" class="notice warning panel-notice"><AlertTriangle :size="17"/>{{snapshot.errors.join('；')}}</div>
<div class="summary-strip"><span>治理文件定义：<strong>{{snapshot?.definedCount||0}}</strong></span><span>已匹配仓库：<strong>{{classifiedCount}}</strong></span><span>尚未分级：<strong>{{repositories.length-classifiedCount}}</strong></span></div>
<div class="filters"><label class="searchbox"><Scale :size="15"/><input v-model="text" placeholder="搜索仓库、等级、状态或备注…"/></label><a href="https://github.com/weepwood/projects/blob/main/governance/projects.yml" target="_blank" rel="noopener noreferrer" class="subtle-button">查看治理文件 <ExternalLink :size="13"/></a></div>
<div class="table-wrap"><table><thead><tr><th>仓库</th><th>等级</th><th>生命周期</th><th>风险</th><th>核对结果</th></tr></thead><tbody>
<tr v-for="item in listed" :key="item.repo.id"><td><div class="repo-name">{{item.repo.fullName}}</div><div class="repo-desc">{{item.rule?.notes||'尚未设置治理分级'}}</div></td><td><span class="tier">{{item.rule?.tier||'未分级'}}</span></td><td>{{item.rule?.status||'未设置'}}</td><td>{{item.rule?.data_risk||'—'}}</td><td><span v-if="snapshot?.conflicts.some(x=>x.repository===item.repo.fullName)" class="run-status bad">配置冲突</span><span v-else-if="item.rule" class="run-status ok">已匹配</span><span v-else class="run-status neutral">待分级</span></td></tr>
<tr v-if="!listed.length"><td colspan="5" class="empty">暂无符合条件的仓库</td></tr>
</tbody></table></div><div class="work-footnote">本页只读；分级与生命周期继续由治理文件维护。</div></section>
</template>
