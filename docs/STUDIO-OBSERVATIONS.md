# 在画室挑一页观察

2026-10-05，第四十四切片；基线 `17f02b5`。用户要求继续构建，并先深入调研近似产品的实际情况。

调研见 [同类产品调研](COMPETITIVE-RESEARCH-2026-10.md)。本轮选择把已有真实材料接到行动上：画室开始页目前只提供自建作品与试用练习，已经进画室的人还得离开去院子找观察。让最近收好的发现直接出现，可检索全部历史，再明确接下一件自己的创作。地图仍是唯一主入口。

## 实现契约

开始页先提供观察，再提供自建作品和现有练习。只列已收录记录，默认最近三页；更多记录逐批展开，地点／正文／日期检索与类别筛选共用 `observationEntries`，不截断或复制历史。无观察或只有草稿时，去原观察册留一页，草稿不冒充素材，不自动开始任务。

未关联观察直接复用 `ObservationCraftDialog` 的完整预览、图片选择、自己的作品名与完成条件；看与取消不写数据。明确接取仍走 `openObservationWork`，沿用素材快照、空白成果、共享图片预算、三件上限和零额外奖励。成功留在画室并聚焦作品标题。已有作品显示正在做／先放着／已收好的状态，直接打开同一件；满三件也能打开，暂放后接续仍明确执行原规则。

不加存档字段、内容声明、奖励、依赖或导航入口。开始页的截取只影响显示数量，卡片节选长地点与正文，预览显示完整内容，所有历史仍可检索与展开。图片只读原图，预览读原观察，已有作品读接取时快照。

## 验收契约

运行 `npm test`、build、check:release。DEV 与正式 preview 的 1280／375px 隔离上下文检查地图进入画室、第二击预览、0页／草稿空态、45页历史、筛选检索与空结果、长文与图片、取消焦点与无写入、明确接取、既有关联的三种状态、满三件拒绝和只读打开、刷新、小家日夜。检查截图并修复布局问题，不触碰正式存档。本轮无推送或发布，开场在途文件继续保留。

## 实现与验收记录

选择器只读既有观察、关联与作品状态，入口在自建作品和练习前。最近三页、每次再看六页、按完整地点／正文／日期检索与类别组合筛选已实现；45页全部可展开，最旧一页可直接检索。只有草稿时提示先收好，空态按钮回院子原观察册。没有新素材副本、存档字段或业务规则。

未关联页复用原素材对话框，接取走原 store API；完成后留在画室并聚焦作品标题，素材不会填进成果区。关联项显示正在做／先放着／已收好并直接打开同一件，满三件也能打开；暂放不自动接续，继续按钮仍守原上限。

118/118项测试通过，无新规则测试；最终 build／check:release 通过，24枚蚀刻、27个运行时包、Privacy Manifest 完整。Playwright CLI DEV／正式 × 1280／375px 四组最终主流程 PASS，无 pageerror／横向溢出，覆盖空态／草稿返回、45页、最旧检索、类别／清除、展开全部、本地 Canvas 图实际解码、地图两击预览、取消零写入与还焦点、明确接取与空成果门槛、三种状态、满三件只读与接续拒绝、刷新与小家日夜。

亲看截图后发现手机筛选字段上下堆叠、长地点占多行，把素材推低；改为并列紧凑筛选，地点／正文两行节选，完整内容留在预览。补最终构建、发布资源检查与四组浏览器重跑，全部通过。原生文件、真机容量性能与真实用户需求仍未验证；既有 three 阴影 API 警告保留。网络调研没有代替用户测试。

证据：[测试](../output/studio-observations-tests.txt)、[构建](../output/studio-observations-build.txt)、[发布资源](../output/studio-observations-release.txt)、[浏览器四组](../output/studio-observations-browser.txt)；[手机最近观察](../output/playwright/studio-observations-release-recent-375.png)、[桌面最近观察](../output/playwright/studio-observations-release-recent-1280.png)、[最旧记录检索](../output/playwright/studio-observations-release-oldest-375.png)、[满三件预览](../output/playwright/studio-observations-release-full-375.png)、[日间小家](../output/playwright/studio-observations-release-home-day-1280.png)、[夜间小家](../output/playwright/studio-observations-release-home-night-375.png)。其余同前缀截图为一次性本地 fixture。

重跑：启动 app Vite 5192 与 preview 5193，打开 Playwright CLI `-s=kuangye-craft` 会话后运行 `node scripts/qa-studio-observations.mjs`。脚本为隔离浏览器上下文，DEV 使用独立 `?qa` 存档键，正式 preview 仅本地一次性 fixture。
