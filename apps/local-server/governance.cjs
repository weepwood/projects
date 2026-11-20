"use strict";
const fs=require("node:fs"),path=require("node:path");
const FILE=path.resolve(__dirname,"../../governance/projects.yml");
const ALLOWED_FIELDS=new Set(["repo","tier","status","kind","data_risk","governance","notes","visibility"]);
function unquote(v){return v.replace(/^(['"])(.*)\1$/,"$2")}
function parseGovernance(text){const items={},errors=[];let inside=false,current=null,linen=0;for(const raw of text.split(/\r?\n/)){linen++;if(!inside){if(/^projects:\s*(?:#.*)?$/.test(raw))inside=true;continue}if(/^\S/.test(raw)){break}const line=raw.trim();if(!line||line.startsWith("#"))continue;const start=raw.match(/^  - repo:\s*(.*?)\s*$/);if(start){const fullName=unquote(start[1]).split(" #")[0].trim();if(!/^[a-z\d_.-]+\/[a-z\d_.-]+$/i.test(fullName)){errors.push("第 "+linen+" 行的仓库名称无效");current=null;continue}current={repo:fullName};items[fullName.toLowerCase()]=current;continue}const field=raw.match(/^    ([a-z_]+):\s*(.*?)\s*$/);if(field&&current&&ALLOWED_FIELDS.has(field[1]))current[field[1]]=unquote(field[2]).trim()}return {items,errors}}
function loadGovernance(){try{return parseGovernance(fs.readFileSync(FILE,"utf8"))}catch(e){return {items:{},errors:["无法读取治理配置："+e.message]}}}
module.exports={parseGovernance,loadGovernance};
