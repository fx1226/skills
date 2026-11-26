# SVN 审查范围

按目标记录工作副本根、目标 URL、仓库 root／UUID、范围和方向。跨工作副本送审时，每份单独固定基线和改动，再按共享接口或数据串联审查。同一仓库的修订号也须配上目标路径。下文的 A、B、R、PEG 代表已解析的数字修订，路径作为独立参数传递。

## 工作副本与提交前审查

1. 用 `svn info --xml TARGET` 定位工作副本。基线取各节点自己的 BASE。遇到混合修订、switched 子树或稀疏检出时，按需用 `svn info --xml --depth infinity TARGET` 核对本地节点的 URL、修订和 depth。稀疏目录之外的内容需另取证。
2. 用 `svn status --xml --no-ignore --ignore-externals --depth infinity TARGET` 盘点本地状态，用 `svn diff --internal-diff TARGET` 读正文和属性。查看 XML 中的文本、属性、冲突、复制及 changelist 信息。核对新增、删除、替换、移动、缺失和阻塞节点。工作副本根的修订号加一份文件名清单不足以复现本地修改，记录相关内容和属性的指纹。
3. 仅审指定 changelist 时，按 `svn status --xml --verbose --ignore-externals --changelist NAME TARGET` 和 `svn diff --internal-diff --changelist NAME TARGET` 固定成员及其**当前整文件改动**。目录属性和未版本化文件不能加入 changelist。若送审代码依赖未入组改动，说明单独交付的后果和证据；工作目录中用到该依赖的自测只证明该组合。
4. external 记录定义及有效目标，用户纳入范围时再独立审查。未版本化／忽略文件按导入、构建或交付依赖取证。冲突用 status／info 固定证据，冲突部分报告未能确定的最终行为。普通本地 status 不查询服务端新旧状态。只读审查保持工作副本原状。

## 历史修订

从仓库端点读取历史 diff，并用相同快照扩读调用方、配置及测试，例如 `svn cat -r B FILE_URL@PEG`。PEG 取能定位该节点的修订；实际比较版本由操作修订决定。历史路径已删除、改名或同名重建时，先从仍存在的父目录查节点沿革。本地文件名含字面量 @ 时，可在目标末尾加空 peg 标记（如 `mail@host.txt@`）。

| 审查意图 | 比较方式 |
|---|---|
| 单修订 R | `svn diff --internal-diff -c R URL@PEG` 查看 R−1 → R。对删除或新增节点，必要时从两端均存在的父目录取差异并限定目标。 |
| 两个端点的净变化 A → B | `svn diff --internal-diff -r A:B URL@PEG` 保留方向。用 `svn diff --summarize --xml -r A:B URL@PEG` 盘点节点，再读正文和属性。 |
| 包含 rX 至 rY 的连续修订 | 用户要整体净效果时比较 X−1 → Y；要逐次审查时逐个取 `-c R`。只写“rX-rY”且两种解释会改变结果时澄清。 |
| 指定离散修订 | 对每个指定 R 分别审 `-c R`，固定其前态和依赖。最小到最大修订之间可能夹有其他改动。需要评价挑选合入后的组合结果时，另取实际目标合入快照。 |

用 `svn log --xml -v` 补充历史，过滤同一次全库提交的兄弟路径。端点 A < B 时日志取 A+1:B，A > B 时取 A:B+1，A = B 时核对空差异即可。先算出数字再传给命令。

## 分支、标签与合入

| 审查意图 | 需要的证据 |
|---|---|
| 比较两个分支或标签的指定状态 | 固定双方 URL 和数字修订，用 `svn diff --internal-diff OLD_URL@A NEW_URL@B`，保留双方独有变化。 |
| 查看分支从复制来源起的净变化 | 查 `svn log --xml -v --stop-on-copy BRANCH_URL@B` 的相关复制记录，取得 copy-from 路径及**来源修订**。以来源快照和分支快照作双 URL 比较。复制后的同步合入同样可能体现在净差异中。若要求仅归因分支自身提交，应另核对逐修订历史和合并记录。 |
| 审查已经合入目标的结果 | 未提交合入审目标工作副本的 BASE → WORKING，并交代同时存在的本地编辑；已提交合入审目标路径的合入修订。核对目标内容、冲突处理和 `svn:mergeinfo` 属性。若要判断某个源改动是否到达，交叉核对源修订补丁、目标提交及目标端点内容。仅改 mergeinfo 的提交能改变合并记录；手工移植正文也可能没有对应的合并记录。 |

## 特殊节点与缺口

- 工作副本复制／移动可用 `svn info --xml` 核对来源，历史复制／替换查日志的 action、copyfrom-path 和 copyfrom-rev。同名替换且祖先关系影响判断时，用 `svn diff --summarize --xml --notice-ancestry` 配上原比较端点，同一路径的删除、新增分别留证。跨 URL 摘要按相对路径映射双方节点。读正文时另用 `--internal-diff`，摘要命令与正文命令分开执行。
- property-only 修改直接定位节点与属性。检查可执行位、换行、externals、mergeinfo 和 `svn:special` 对构建、部署或链接目标的影响。二进制文件核对来源、格式和下游契约，缺正文时明确覆盖限制。
- URL 不可读、权限受限、缺历史节点或冲突未解时，注明具体路径和仍可核实的部分。保持审查只读；需要补齐工作副本或改动仓库状态时，遵循已有授权。
