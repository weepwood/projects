---
title: LocalLens
category: 媒体管理
summary: 不搬动原文件，也能把电脑里的照片和视频整理成可检索的媒体库。
audience: 希望自己保管原片，又想在不同设备上浏览媒体的人。
approach: Windows 端为选定文件夹建立本地索引、缩略图和虚拟分类；Android 设备通过局域网配对浏览。
repo: https://github.com/weepwood/LocalLens
action: 查看安装说明
illustration: assets/LocalLens.svg
illustrationCaption: 本地索引与设备配对
---

## 使用流程

1. 在 Windows 端选择需要纳入的文件夹，LocalLens 建立本地索引与缩略图。
2. 用虚拟分类给照片打标记，原文件保持原位，不会被移动或复制。
3. Android 设备通过局域网与电脑配对，在手机上浏览同一份索引。

## 为什么不动原文件

媒体库最常见的失败是「整理之后照片找不到了」。LocalLens 只写入索引和缩略图，删除索引即可完全恢复到使用前的状态。

## 索引与隐私

索引保存在本机，配对只在局域网内进行，不经过任何外部服务器。
