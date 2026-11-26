# Git 审查范围

下面 `base`、`tip`、`commit` 均指已验证并记录的提交 ID；先用 `git rev-parse --verify '<ref>^{commit}'` 验证引用，不在错误时静默替换成 HEAD 或 main。

建议状态入口：
- `git --no-optional-locks status --porcelain=v1 -z --untracked-files=all`
- `git diff --no-ext-diff --no-textconv --name-status -z`
- `git diff --no-ext-diff --no-textconv --cached --name-status -z`

| 请求模式 | 正文比较 | 必须说明 |
|---|---|---|
| 分支从基线分叉后的变化 | 求 `git merge-base base tip`，再 `git diff --no-ext-diff --no-textconv <merge-base> tip --` | 等价于该语义下的三点 diff；不是当前 base 树到 tip 的差异 |
| 两个端点的净树变化 | `git diff --no-ext-diff --no-textconv base tip --` | 保留用户指定方向，不替换成共同祖先 |
| 普通单提交 | `git diff --no-ext-diff --no-textconv commit^ commit --` | 比较该提交的父树，不顺带审查之后到 HEAD 的变化 |
| 根提交 | `git diff-tree --root --no-commit-id -r -p --no-ext-diff --no-textconv commit --` | 根提交与空树比较，核对新增节点 |
| 合并提交 | 先确定父提交、逐父比较或合并结果的目标语义 | combined diff 可能遗漏未同时相对多父变化的路径，不能当作完整覆盖清单 |
| 仅 staged | `git diff --no-ext-diff --no-textconv --cached --` | 省略提交参数时，有 HEAD 则以 HEAD 为基线，首次提交前也可直接列出已暂存的新增文件 |
| 仅 unstaged | `git diff --no-ext-diff --no-textconv --` | index 到工作树，不包含 staged |
| 全部未提交 | 分读 staged 与 unstaged；有 HEAD 时用 `git diff --no-ext-diff --no-textconv <head> --` 核对净效果 | 两层修改可互相抵消；首次提交前同样分层读取，并核对未跟踪内容 |
| 未跟踪文件 | 由完整 status 列出，读取范围内文件正文 | 不在普通 diff 内；按交付依赖判断，不自动认定都应提交 |

仅审 staged 时，按需用 `git show :路径` 读取 index 中的内容；审提交时从固定提交树读取调用方和测试。工作树另有修改时，直接在其上运行的测试只说明工作树行为。

分支提交上下文可用 `git log base..tip --oneline`，端点比较同样可查看日志，但树差异才定义最终审查对象。三点 diff 不是所有“review since X”的统一答案。

特殊情况：
- PR 的 base/head 应取请求提供或已授权读取的实际元数据，不能假设目标分支叫 main。平台展示差异与本地基线不一致时说明原因。
- 多个 merge-base、浅克隆、缺失对象或未出生分支：确认可用证据和比较语义；不能自动补全历史时报告限制。
- working tree 任务若含冲突，读取冲突标记及 index stages，冲突部分不宣称已形成最终交付。
- rename/copy 结合检测结果及前后内容；删除追踪调用方与部署依赖；symlink 检查目标和信任边界。
- submodule 记录前后对象指针；内部变化未取证时明确缺口，不自动进入其仓库扩大范围。
- 忽略文件仅在明确关联交付时补查；不得把忽略规则当成敏感配置和生成物必然安全的证明。
- 同一路径可同时出现 staged 删除和未跟踪的新文件。为每层保留状态及内容，分别判断将交付哪个版本。
